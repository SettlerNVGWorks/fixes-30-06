import requests
import unittest
import sys
import json
from datetime import datetime

class SportPrognosisAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Endpoint",
            "GET",
            "api/health",
            200
        )
        if success:
            print(f"Health Status: {response.get('status')}")
            print(f"Timestamp: {response.get('timestamp')}")
        return success

    def test_stats_endpoint(self):
        """Test the stats endpoint"""
        success, response = self.run_test(
            "Stats Endpoint",
            "GET",
            "api/stats",
            200
        )
        if success:
            print(f"Total Predictions: {response.get('total_predictions')}")
            print(f"Success Rate: {response.get('success_rate')}%")
            print(f"Active Bettors: {response.get('active_bettors')}")
            print(f"Monthly Wins: {response.get('monthly_wins')}")
        return success

    def test_predictions_endpoint(self):
        """Test the predictions endpoint"""
        success, response = self.run_test(
            "Predictions Endpoint",
            "GET",
            "api/predictions",
            200
        )
        if success:
            predictions = response.get('predictions', [])
            print(f"Total Predictions: {response.get('total')}")
            print(f"Predictions Returned: {len(predictions)}")
            if predictions:
                print(f"First Prediction: {predictions[0]['match']} - {predictions[0]['prediction']}")
        return success

    def test_sport_stats_endpoint(self, sport):
        """Test the sport stats endpoint"""
        success, response = self.run_test(
            f"{sport.capitalize()} Stats Endpoint",
            "GET",
            f"api/sports/{sport}/stats",
            200
        )
        if success:
            stats = response.get('stats', {})
            print(f"{sport.capitalize()} Predictions: {stats.get('predictions')}")
            print(f"{sport.capitalize()} Accuracy: {stats.get('accuracy')}%")
            print(f"{sport.capitalize()} Profit: {stats.get('profit')}")
        return success

    def test_telegram_stats_endpoint(self):
        """Test the telegram stats endpoint"""
        success, response = self.run_test(
            "Telegram Stats Endpoint",
            "GET",
            "api/telegram/stats",
            200
        )
        if success:
            stats_message = response.get('stats_message', '')
            recent_predictions = response.get('recent_predictions', [])
            print(f"Stats Message Length: {len(stats_message)}")
            print(f"Recent Predictions Count: {len(recent_predictions)}")
        return success

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://9566aa0d-d953-4b41-9c1e-ab1e620892ce.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = SportPrognosisAPITester(backend_url)
    
    # Run tests
    health_test = tester.test_health_endpoint()
    stats_test = tester.test_stats_endpoint()
    predictions_test = tester.test_predictions_endpoint()
    baseball_stats_test = tester.test_sport_stats_endpoint("baseball")
    telegram_stats_test = tester.test_telegram_stats_endpoint()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Return success if all tests passed
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())