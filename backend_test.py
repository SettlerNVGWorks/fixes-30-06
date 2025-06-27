import requests
import unittest
import sys
import json
from datetime import datetime

class SportPredictionsAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.user_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
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
                print(f"First Prediction Sport: {predictions[0].get('sport')}")
                print(f"First Prediction Match: {predictions[0].get('match_name')}")
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

    def test_user_registration(self):
        """Test user registration"""
        # Generate a unique username and telegram tag
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        username = f"testuser_{timestamp}"
        telegram_tag = f"@test_{timestamp}"
        
        user_data = {
            "telegram_tag": telegram_tag,
            "username": username,
            "password": "Test123!",
            "confirmPassword": "Test123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            201,
            data=user_data
        )
        
        if success:
            self.token = response.get('token')
            self.user_data = response.get('user')
            print(f"Registered User: {self.user_data.get('username')}")
            print(f"Telegram Tag: {self.user_data.get('telegram_tag')}")
            print(f"Registration Date: {self.user_data.get('registration_date')}")
        
        return success

    def test_user_login(self):
        """Test user login with telegram_tag"""
        if not self.user_data:
            print("⚠️ No registered user to test login with")
            return False
        
        login_data = {
            "telegram_tag": self.user_data.get('telegram_tag'),
            "password": "Test123!"
        }
        
        success, response = self.run_test(
            "User Login with Telegram Tag",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success:
            self.token = response.get('token')
            print(f"Login Successful for: {response.get('user', {}).get('username')}")
            print(f"Using Telegram Tag: {response.get('user', {}).get('telegram_tag')}")
        
        return success
        
    def test_user_login_without_at_symbol(self):
        """Test user login with telegram_tag without @ symbol"""
        if not self.user_data:
            print("⚠️ No registered user to test login with")
            return False
        
        # Remove @ from telegram_tag if it exists
        telegram_tag = self.user_data.get('telegram_tag', '')
        if telegram_tag.startswith('@'):
            telegram_tag = telegram_tag[1:]
        
        login_data = {
            "telegram_tag": telegram_tag,
            "password": "Test123!"
        }
        
        success, response = self.run_test(
            "User Login with Telegram Tag (without @ symbol)",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success:
            self.token = response.get('token')
            print(f"Login Successful for: {response.get('user', {}).get('username')}")
            print(f"Using Telegram Tag without @: {telegram_tag}")
            print(f"Server returned Telegram Tag: {response.get('user', {}).get('telegram_tag')}")
        
        return success

    def test_user_profile(self):
        """Test getting user profile (authenticated)"""
        if not self.token:
            print("⚠️ No auth token available for profile test")
            return False
        
        success, response = self.run_test(
            "User Profile",
            "GET",
            "api/auth/profile",
            200,
            auth=True
        )
        
        if success:
            user = response.get('user', {})
            print(f"Profile Username: {user.get('username')}")
            print(f"Profile Telegram: {user.get('telegram_tag')}")
        
        return success

    def test_change_password(self):
        """Test changing password (authenticated)"""
        if not self.token:
            print("⚠️ No auth token available for password change test")
            return False
        
        password_data = {
            "currentPassword": "Test123!",
            "newPassword": "NewTest456!",
            "confirmNewPassword": "NewTest456!"
        }
        
        success, response = self.run_test(
            "Change Password",
            "PUT",
            "api/auth/change-password",
            200,
            data=password_data,
            auth=True
        )
        
        if success:
            print(f"Password Change Message: {response.get('message')}")
            
            # Test login with new password
            login_data = {
                "telegram_tag": self.user_data.get('telegram_tag'),
                "password": "NewTest456!"
            }
            
            login_success, login_response = self.run_test(
                "Login with New Password",
                "POST",
                "api/auth/login",
                200,
                data=login_data
            )
            
            if login_success:
                self.token = login_response.get('token')
                print("Login with new password successful")
            else:
                print("⚠️ Login with new password failed")
                return False
        
        return success

    def test_logout(self):
        """Test user logout (authenticated)"""
        if not self.token:
            print("⚠️ No auth token available for logout test")
            return False
        
        success, response = self.run_test(
            "User Logout",
            "POST",
            "api/auth/logout",
            200,
            auth=True
        )
        
        if success:
            print(f"Logout Message: {response.get('message')}")
            self.token = None
        
        return success

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://89ccc313-b4ae-4ac4-b119-cb856652aefb.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = SportPredictionsAPITester(backend_url)
    
    # Run basic API tests
    print("\n=== Testing Basic API Endpoints ===")
    health_test = tester.test_health_endpoint()
    stats_test = tester.test_stats_endpoint()
    predictions_test = tester.test_predictions_endpoint()
    
    # Test sport-specific endpoints
    print("\n=== Testing Sport-Specific Endpoints ===")
    baseball_stats_test = tester.test_sport_stats_endpoint("baseball")
    football_stats_test = tester.test_sport_stats_endpoint("football")
    hockey_stats_test = tester.test_sport_stats_endpoint("hockey")
    esports_stats_test = tester.test_sport_stats_endpoint("esports")
    telegram_stats_test = tester.test_telegram_stats_endpoint()
    
    # Test authentication flow
    print("\n=== Testing Authentication Flow ===")
    registration_test = tester.test_user_registration()
    login_test = tester.test_user_login()
    login_without_at_test = tester.test_user_login_without_at_symbol()
    profile_test = tester.test_user_profile()
    password_change_test = tester.test_change_password()
    logout_test = tester.test_logout()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Return success if all tests passed
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())