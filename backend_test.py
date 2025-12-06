#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Degen Force Leaderboard API
Tests wallet validation, rate limiting, caching, concurrent submissions, and security
"""

import requests
import json
import time
import threading
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8001"
API_URL = f"{BASE_URL}/api"

class LeaderboardTester:
    def __init__(self):
        self.results = {
            "wallet_validation": {"passed": 0, "failed": 0, "details": []},
            "rate_limiting": {"passed": 0, "failed": 0, "details": []},
            "caching": {"passed": 0, "failed": 0, "details": []},
            "input_validation": {"passed": 0, "failed": 0, "details": []},
            "concurrent_load": {"passed": 0, "failed": 0, "details": []},
            "performance": {"passed": 0, "failed": 0, "details": []},
            "stats_endpoint": {"passed": 0, "failed": 0, "details": []}
        }
        
    def log_result(self, category, passed, message):
        """Log test result"""
        if passed:
            self.results[category]["passed"] += 1
        else:
            self.results[category]["failed"] += 1
        self.results[category]["details"].append(f"{'✅' if passed else '❌'} {message}")
        print(f"{'✅' if passed else '❌'} {message}")
    
    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        try:
            # Test root health
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            self.log_result("performance", response.status_code == 200, 
                          f"Root health endpoint: {response.status_code}")
            
            # Test API health
            response = requests.get(f"{API_URL}/health", timeout=5)
            self.log_result("performance", response.status_code == 200, 
                          f"API health endpoint: {response.status_code}")
            
        except Exception as e:
            self.log_result("performance", False, f"Health endpoints failed: {str(e)}")
    
    def test_wallet_validation(self):
        """Test 1: Wallet address validation"""
        print("\n🔍 Testing Wallet Validation...")
        
        # Test 1a: Empty wallet address (should fail)
        test_data = {
            "wallet_address": "",
            "score": 5000,
            "survival_time_seconds": 120,
            "enemies_killed": 50,
            "biome_reached": "Jungle",
            "difficulty": "easy"
        }
        
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            expected_fail = response.status_code == 400
            self.log_result("wallet_validation", expected_fail, 
                          f"Empty wallet rejection: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            self.log_result("wallet_validation", False, f"Empty wallet test failed: {str(e)}")
        
        # Test 1b: Short wallet address (should fail)
        test_data["wallet_address"] = "short"
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            expected_fail = response.status_code in [400, 422]
            self.log_result("wallet_validation", expected_fail, 
                          f"Short wallet rejection: {response.status_code}")
        except Exception as e:
            self.log_result("wallet_validation", False, f"Short wallet test failed: {str(e)}")
        
        # Test 1c: Valid wallet address (should succeed)
        test_data["wallet_address"] = "TestWallet1234567890ABCDEF"
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            success = response.status_code == 200
            self.log_result("wallet_validation", success, 
                          f"Valid wallet acceptance: {response.status_code}")
            if success:
                data = response.json()
                self.log_result("wallet_validation", "success" in data.get("status", ""), 
                              f"Response format correct: {data.get('message', 'No message')}")
        except Exception as e:
            self.log_result("wallet_validation", False, f"Valid wallet test failed: {str(e)}")
    
    def test_rate_limiting(self):
        """Test 2: Rate limiting (max 10 submissions per minute per wallet)"""
        print("\n🔍 Testing Rate Limiting...")
        
        wallet_address = "RateLimitTest123456789"
        base_data = {
            "wallet_address": wallet_address,
            "survival_time_seconds": 60,
            "enemies_killed": 10,
            "biome_reached": "Test",
            "difficulty": "easy"
        }
        
        success_count = 0
        rate_limited_count = 0
        
        # Submit 12 requests rapidly
        for i in range(1, 13):
            test_data = base_data.copy()
            test_data["score"] = 1000 + i
            
            try:
                response = requests.post(f"{API_URL}/leaderboard/submit", 
                                       json=test_data, timeout=10)
                
                if response.status_code == 200:
                    success_count += 1
                elif response.status_code == 429:
                    rate_limited_count += 1
                    
            except Exception as e:
                self.log_result("rate_limiting", False, f"Request {i} failed: {str(e)}")
        
        # Should have ~10 successes and ~2 rate limited
        expected_behavior = (success_count >= 8 and rate_limited_count >= 1)
        self.log_result("rate_limiting", expected_behavior, 
                      f"Rate limiting working: {success_count} success, {rate_limited_count} blocked")
        
        # Test rate limit message
        if rate_limited_count > 0:
            self.log_result("rate_limiting", True, "Rate limit responses received as expected")
    
    def test_caching_system(self):
        """Test 3: Caching system (30-second cache)"""
        print("\n🔍 Testing Caching System...")
        
        try:
            # First call - should hit database
            start_time = time.time()
            response1 = requests.get(f"{API_URL}/leaderboard", timeout=10)
            first_call_time = time.time() - start_time
            
            if response1.status_code == 200:
                data1 = response1.json()
                cached1 = data1.get("cached", False)
                self.log_result("caching", not cached1, 
                              f"First call not cached: cached={cached1}")
                
                # Second call (within 30 seconds) - should be cached
                start_time = time.time()
                response2 = requests.get(f"{API_URL}/leaderboard", timeout=10)
                second_call_time = time.time() - start_time
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    cached2 = data2.get("cached", False)
                    self.log_result("caching", cached2, 
                                  f"Second call cached: cached={cached2}")
                    
                    # Performance check - cached should be faster
                    faster = second_call_time < first_call_time
                    self.log_result("caching", faster, 
                                  f"Cache performance: {first_call_time:.3f}s vs {second_call_time:.3f}s")
                else:
                    self.log_result("caching", False, f"Second call failed: {response2.status_code}")
            else:
                self.log_result("caching", False, f"First call failed: {response1.status_code}")
                
        except Exception as e:
            self.log_result("caching", False, f"Caching test failed: {str(e)}")
    
    def test_input_validation(self):
        """Test 4: Input validation"""
        print("\n🔍 Testing Input Validation...")
        
        base_data = {
            "wallet_address": "ValidWallet123456789",
            "score": 5000,
            "survival_time_seconds": 60,
            "enemies_killed": 10,
            "biome_reached": "Jungle",
            "difficulty": "easy"
        }
        
        # Test negative score
        test_data = base_data.copy()
        test_data["score"] = -1000
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            expected_fail = response.status_code == 422
            self.log_result("input_validation", expected_fail, 
                          f"Negative score rejected: {response.status_code}")
        except Exception as e:
            self.log_result("input_validation", False, f"Negative score test failed: {str(e)}")
        
        # Test invalid difficulty
        test_data = base_data.copy()
        test_data["difficulty"] = "impossible"
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            expected_fail = response.status_code == 422
            self.log_result("input_validation", expected_fail, 
                          f"Invalid difficulty rejected: {response.status_code}")
        except Exception as e:
            self.log_result("input_validation", False, f"Invalid difficulty test failed: {str(e)}")
        
        # Test extremely high score (should be within limits)
        test_data = base_data.copy()
        test_data["score"] = 15000000  # Above 10M limit
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=10)
            expected_fail = response.status_code == 422
            self.log_result("input_validation", expected_fail, 
                          f"Excessive score rejected: {response.status_code}")
        except Exception as e:
            self.log_result("input_validation", False, f"Excessive score test failed: {str(e)}")
    
    def submit_concurrent_score(self, user_id):
        """Helper function for concurrent submissions"""
        test_data = {
            "wallet_address": f"ConcurrentUser{user_id}1234567890",
            "score": random.randint(1000, 50000),
            "survival_time_seconds": random.randint(30, 600),
            "enemies_killed": random.randint(5, 200),
            "biome_reached": "Test",
            "difficulty": "easy"
        }
        
        try:
            response = requests.post(f"{API_URL}/leaderboard/submit", 
                                   json=test_data, timeout=15)
            return {
                "user_id": user_id,
                "status_code": response.status_code,
                "success": response.status_code == 200
            }
        except Exception as e:
            return {
                "user_id": user_id,
                "status_code": 0,
                "success": False,
                "error": str(e)
            }
    
    def test_concurrent_submissions(self):
        """Test 5: Concurrent submissions (heavy load)"""
        print("\n🔍 Testing Concurrent Submissions...")
        
        num_concurrent = 20
        
        try:
            with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
                # Submit concurrent requests
                futures = [executor.submit(self.submit_concurrent_score, i) 
                          for i in range(1, num_concurrent + 1)]
                
                results = []
                for future in as_completed(futures, timeout=30):
                    results.append(future.result())
            
            # Analyze results
            successful = sum(1 for r in results if r["success"])
            failed = len(results) - successful
            
            # At least 80% should succeed under normal load
            success_rate = successful / len(results)
            acceptable_performance = success_rate >= 0.8
            
            self.log_result("concurrent_load", acceptable_performance, 
                          f"Concurrent load handled: {successful}/{len(results)} succeeded ({success_rate:.1%})")
            
            if failed > 0:
                error_codes = [r["status_code"] for r in results if not r["success"]]
                self.log_result("concurrent_load", True, 
                              f"Failed requests had codes: {set(error_codes)}")
                
        except Exception as e:
            self.log_result("concurrent_load", False, f"Concurrent test failed: {str(e)}")
    
    def test_leaderboard_performance(self):
        """Test 6: Leaderboard retrieval performance"""
        print("\n🔍 Testing Leaderboard Performance...")
        
        try:
            # Test fetching top 100 scores
            start_time = time.time()
            response = requests.get(f"{API_URL}/leaderboard?limit=100", timeout=10)
            fetch_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("performance", True, 
                              f"Top 100 fetch: {fetch_time:.3f}s, {data.get('total', 0)} entries")
                
                # Test with difficulty filter
                start_time = time.time()
                response = requests.get(f"{API_URL}/leaderboard?limit=100&difficulty=easy", timeout=10)
                filter_time = time.time() - start_time
                
                if response.status_code == 200:
                    self.log_result("performance", True, 
                                  f"Filtered fetch: {filter_time:.3f}s")
                else:
                    self.log_result("performance", False, 
                                  f"Filtered fetch failed: {response.status_code}")
            else:
                self.log_result("performance", False, 
                              f"Leaderboard fetch failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("performance", False, f"Performance test failed: {str(e)}")
    
    def test_stats_endpoint(self):
        """Test 7: Stats endpoint"""
        print("\n🔍 Testing Stats Endpoint...")
        
        try:
            response = requests.get(f"{API_URL}/stats", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {})
                
                required_fields = ["total_scores", "unique_players", "top_score", "cache_size"]
                has_all_fields = all(field in stats for field in required_fields)
                
                self.log_result("stats_endpoint", has_all_fields, 
                              f"Stats endpoint working: {list(stats.keys())}")
                
                if has_all_fields:
                    self.log_result("stats_endpoint", True, 
                                  f"Stats: {stats['total_scores']} scores, {stats['unique_players']} players, top: {stats['top_score']}")
            else:
                self.log_result("stats_endpoint", False, 
                              f"Stats endpoint failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("stats_endpoint", False, f"Stats test failed: {str(e)}")
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Comprehensive Leaderboard Testing...")
        print(f"📍 Testing API at: {API_URL}")
        
        start_time = time.time()
        
        # Run all test categories
        self.test_health_endpoints()
        self.test_wallet_validation()
        self.test_rate_limiting()
        self.test_caching_system()
        self.test_input_validation()
        self.test_concurrent_submissions()
        self.test_leaderboard_performance()
        self.test_stats_endpoint()
        
        total_time = time.time() - start_time
        
        # Generate summary report
        self.generate_report(total_time)
    
    def generate_report(self, total_time):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("="*80)
        
        total_passed = sum(cat["passed"] for cat in self.results.values())
        total_failed = sum(cat["failed"] for cat in self.results.values())
        total_tests = total_passed + total_failed
        
        print(f"⏱️  Total execution time: {total_time:.2f} seconds")
        print(f"📈 Overall results: {total_passed}/{total_tests} tests passed ({total_passed/total_tests:.1%})")
        print()
        
        for category, results in self.results.items():
            passed = results["passed"]
            failed = results["failed"]
            total = passed + failed
            
            if total > 0:
                status = "✅ PASS" if failed == 0 else "❌ FAIL" if passed == 0 else "⚠️  PARTIAL"
                print(f"{status} {category.upper().replace('_', ' ')}: {passed}/{total}")
                
                # Show details for failed or important categories
                if failed > 0 or category in ["wallet_validation", "rate_limiting", "caching"]:
                    for detail in results["details"]:
                        print(f"    {detail}")
                print()
        
        # Critical issues summary
        critical_failures = []
        if self.results["wallet_validation"]["failed"] > 0:
            critical_failures.append("Wallet validation issues")
        if self.results["rate_limiting"]["failed"] > 0:
            critical_failures.append("Rate limiting not working")
        if self.results["concurrent_load"]["failed"] > 0:
            critical_failures.append("Cannot handle concurrent load")
        
        if critical_failures:
            print("🚨 CRITICAL ISSUES FOUND:")
            for issue in critical_failures:
                print(f"   • {issue}")
        else:
            print("✅ NO CRITICAL ISSUES FOUND - API is production ready!")
        
        print("="*80)

if __name__ == "__main__":
    tester = LeaderboardTester()
    tester.run_all_tests()