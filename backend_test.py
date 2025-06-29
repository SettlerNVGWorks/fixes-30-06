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

    def test_today_matches_endpoint(self):
        """Test the today's matches endpoint"""
        success, response = self.run_test(
            "Today's Matches Endpoint",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Date: {response.get('date')}")
            print(f"Total Matches: {response.get('total_matches')}")
            print(f"Sports Available: {response.get('sports_available')}")
            
            # Check if all 4 sports are available
            sports_available = response.get('sports_available', [])
            required_sports = ['football', 'baseball', 'hockey', 'esports']
            missing_sports = [sport for sport in required_sports if sport not in sports_available]
            
            if missing_sports:
                print(f"⚠️ Missing sports: {', '.join(missing_sports)}")
                success = False
            else:
                print("✅ All required sports are available")
            
            # Check match structure and analysis
            matches = response.get('matches', {})
            for sport, sport_matches in matches.items():
                print(f"\n{sport.capitalize()} matches: {len(sport_matches)}")
                
                if sport_matches:
                    sample_match = sport_matches[0]
                    print(f"Sample match: {sample_match.get('team1')} vs {sample_match.get('team2')}")
                    print(f"Match time: {sample_match.get('match_time')}")
                    
                    # Verify match structure
                    required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'sport']
                    missing_fields = [field for field in required_fields if field not in sample_match or sample_match.get(field) is None]
                    
                    if missing_fields:
                        print(f"⚠️ Missing required fields in match: {', '.join(missing_fields)}")
                        success = False
                    else:
                        print("✅ Match has all required fields")
                    
                    # Check odds
                    print(f"Odds team1: {sample_match.get('odds_team1')}")
                    print(f"Odds team2: {sample_match.get('odds_team2')}")
                    if sport == 'football':
                        print(f"Odds draw: {sample_match.get('odds_draw')}")
                    
                    # Check analysis
                    analysis = sample_match.get('analysis')
                    if analysis:
                        print(f"Analysis length: {len(analysis)} characters")
                        print(f"Analysis sample: {analysis[:50]}...")
                    else:
                        print("⚠️ No analysis found for match")
                        success = False
        
        return success

    def test_sport_matches_endpoint(self, sport):
        """Test the sport-specific matches endpoint"""
        success, response = self.run_test(
            f"{sport.capitalize()} Matches Endpoint",
            "GET",
            f"api/matches/sport/{sport}",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Sport: {response.get('sport')}")
            print(f"Total Matches: {response.get('total_matches')}")
            
            matches = response.get('matches', [])
            if matches:
                print(f"Matches returned: {len(matches)}")
                
                # Check first match
                sample_match = matches[0]
                print(f"Sample match: {sample_match.get('team1')} vs {sample_match.get('team2')}")
                print(f"Match time: {sample_match.get('match_time')}")
                
                # Verify match structure
                required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'sport']
                missing_fields = [field for field in required_fields if field not in sample_match or sample_match.get(field) is None]
                
                if missing_fields:
                    print(f"⚠️ Missing required fields in match: {', '.join(missing_fields)}")
                    success = False
                else:
                    print("✅ Match has all required fields")
                
                # Check odds
                print(f"Odds team1: {sample_match.get('odds_team1')}")
                print(f"Odds team2: {sample_match.get('odds_team2')}")
                if sport == 'football':
                    print(f"Odds draw: {sample_match.get('odds_draw')}")
                
                # Check analysis
                analysis = sample_match.get('analysis')
                if analysis:
                    print(f"Analysis length: {len(analysis)} characters")
                    print(f"Analysis sample: {analysis[:50]}...")
                else:
                    print("⚠️ No analysis found for match")
                    success = False
                
                # Verify all matches are for the requested sport
                all_correct_sport = all(match.get('sport') == sport for match in matches)
                if all_correct_sport:
                    print(f"✅ All matches are for {sport}")
                else:
                    print(f"⚠️ Some matches are not for {sport}")
                    success = False
            else:
                print(f"⚠️ No matches returned for {sport}")
                success = False
        
        return success

    def test_refresh_matches_endpoint(self):
        """Test the refresh matches endpoint"""
        success, response = self.run_test(
            "Refresh Matches Endpoint",
            "POST",
            "api/matches/refresh",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Message: {response.get('message')}")
            print(f"Total Matches: {response.get('total_matches')}")
            print(f"Updated At: {response.get('updated_at')}")
            
            # Verify matches were actually refreshed by checking today's matches again
            refresh_success, today_response = self.run_test(
                "Today's Matches After Refresh",
                "GET",
                "api/matches/today",
                200
            )
            
            if refresh_success:
                total_matches = today_response.get('total_matches', 0)
                if total_matches > 0:
                    print(f"✅ Successfully refreshed {total_matches} matches")
                else:
                    print("⚠️ No matches found after refresh")
                    success = False
        
        return success
        
    def test_update_daily_matches_endpoint(self):
        """Test the update daily matches endpoint"""
        success, response = self.run_test(
            "Update Daily Matches Endpoint",
            "POST",
            "api/matches/update-daily",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Message: {response.get('message')}")
            print(f"Total Matches: {response.get('total_matches')}")
            print(f"Updated At: {response.get('updated_at')}")
            
            # Check if matches were returned in the response
            matches = response.get('matches', [])
            if matches:
                print(f"✅ Daily update returned {len(matches)} matches")
                
                # Check sports distribution
                sports_count = {}
                for match in matches:
                    sport = match.get('sport')
                    if sport not in sports_count:
                        sports_count[sport] = 0
                    sports_count[sport] += 1
                
                print(f"Sports distribution: {sports_count}")
            else:
                print("⚠️ No matches returned in daily update response")
                success = False
        
        return success
    
    def test_schedule_info_endpoint(self):
        """Test the schedule info endpoint"""
        success, response = self.run_test(
            "Schedule Info Endpoint",
            "GET",
            "api/matches/schedule-info",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Message: {response.get('message')}")
            
            # Check schedule information
            schedule = response.get('schedule', {})
            if schedule:
                print(f"Daily Match Update: {schedule.get('dailyMatchUpdate')}")
                print(f"Old Match Cleanup: {schedule.get('oldMatchCleanup')}")
                print(f"Timezone: {schedule.get('timezone')}")
                
                # Verify schedule is set for 12:00 MSK
                if schedule.get('dailyMatchUpdate') == '12:00 МСК каждый день':
                    print("✅ Schedule correctly set for 12:00 МСК daily")
                else:
                    print(f"⚠️ Schedule not set for 12:00 МСК: {schedule.get('dailyMatchUpdate')}")
                    success = False
                
                # Verify timezone is Moscow
                if schedule.get('timezone') == 'Europe/Moscow':
                    print("✅ Timezone correctly set to Europe/Moscow")
                else:
                    print(f"⚠️ Timezone not set to Europe/Moscow: {schedule.get('timezone')}")
                    success = False
            else:
                print("⚠️ No schedule information returned")
                success = False
            
            # Check next update information
            next_update = response.get('nextUpdate', {})
            if next_update:
                print(f"Next Update: {next_update.get('date')}")
                print(f"Time Until: {next_update.get('timeUntil')}")
            else:
                print("⚠️ No next update information returned")
                success = False
        
        return success

    def test_match_data_structure(self):
        """Test the match data structure in detail"""
        success, response = self.run_test(
            "Match Data Structure Test",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            matches = response.get('matches', {})
            all_sports_present = True
            
            # Required sports
            required_sports = ['football', 'baseball', 'hockey', 'esports']
            
            # Check each sport
            for sport in required_sports:
                sport_matches = matches.get(sport, [])
                if not sport_matches:
                    print(f"⚠️ No {sport} matches found")
                    all_sports_present = False
                    continue
                
                print(f"\n=== {sport.capitalize()} Match Structure ===")
                sample_match = sport_matches[0]
                
                # Check required fields
                required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'sport']
                optional_fields = ['odds_draw', 'prediction', 'confidence_level', 'status']
                
                # Print all fields for inspection
                print(f"Match ID: {sample_match.get('id')}")
                print(f"Teams: {sample_match.get('team1')} vs {sample_match.get('team2')}")
                print(f"Match Time: {sample_match.get('match_time')}")
                print(f"Odds: {sample_match.get('odds_team1')} / {sample_match.get('odds_team2')}")
                if sport == 'football':
                    print(f"Draw Odds: {sample_match.get('odds_draw')}")
                print(f"Analysis: {sample_match.get('analysis')[:100]}...")
                
                # Check for missing required fields
                missing_fields = [field for field in required_fields if field not in sample_match or sample_match.get(field) is None]
                if missing_fields:
                    print(f"⚠️ Missing required fields: {', '.join(missing_fields)}")
                    success = False
                else:
                    print("✅ All required fields present")
                
                # Check data types
                if not isinstance(sample_match.get('odds_team1'), (int, float)):
                    print(f"⚠️ odds_team1 is not a number: {sample_match.get('odds_team1')}")
                    success = False
                
                if not isinstance(sample_match.get('odds_team2'), (int, float)):
                    print(f"⚠️ odds_team2 is not a number: {sample_match.get('odds_team2')}")
                    success = False
                
                if sport == 'football' and sample_match.get('odds_draw') is not None and not isinstance(sample_match.get('odds_draw'), (int, float)):
                    print(f"⚠️ odds_draw is not a number: {sample_match.get('odds_draw')}")
                    success = False
                
                # Check match time format
                try:
                    match_time = sample_match.get('match_time')
                    if match_time:
                        # Try to parse the date
                        if 'T' in match_time:
                            # ISO format
                            datetime.fromisoformat(match_time.replace('Z', '+00:00'))
                        else:
                            # YYYY-MM-DD HH:MM:SS format
                            datetime.strptime(match_time, '%Y-%m-%d %H:%M:%S')
                        print("✅ Match time format is valid")
                    else:
                        print("⚠️ Match time is missing")
                        success = False
                except ValueError as e:
                    print(f"⚠️ Invalid match time format: {match_time} - {str(e)}")
                    success = False
            
            if all_sports_present:
                print("\n✅ All required sports present in the response")
            else:
                print("\n⚠️ Some sports are missing from the response")
                success = False
        
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
    backend_url = "https://45cd1589-09cf-43d2-aa86-315f73b68505.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = SportPredictionsAPITester(backend_url)
    
    # Run basic API tests
    print("\n=== Testing Basic API Endpoints ===")
    health_test = tester.test_health_endpoint()
    
    # Test match parsing system
    print("\n=== Testing Match Parsing System ===")
    print("\n1. Testing Today's Matches Endpoint")
    today_matches_test = tester.test_today_matches_endpoint()
    
    print("\n2. Testing Sport-Specific Matches Endpoints")
    football_matches_test = tester.test_sport_matches_endpoint("football")
    baseball_matches_test = tester.test_sport_matches_endpoint("baseball")
    hockey_matches_test = tester.test_sport_matches_endpoint("hockey")
    esports_matches_test = tester.test_sport_matches_endpoint("esports")
    
    print("\n3. Testing Match Data Structure")
    match_structure_test = tester.test_match_data_structure()
    
    print("\n4. Testing Refresh Matches Endpoint")
    refresh_matches_test = tester.test_refresh_matches_endpoint()
    
    print("\n5. Testing Update Daily Matches Endpoint")
    update_daily_test = tester.test_update_daily_matches_endpoint()
    
    print("\n6. Testing Schedule Info Endpoint")
    schedule_info_test = tester.test_schedule_info_endpoint()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print summary of match parsing system tests
    print("\n=== Match Parsing System Test Summary ===")
    print(f"1. Today's Matches Endpoint: {'✅ PASSED' if today_matches_test else '❌ FAILED'}")
    print(f"2. Sport-Specific Matches Endpoints:")
    print(f"   - Football: {'✅ PASSED' if football_matches_test else '❌ FAILED'}")
    print(f"   - Baseball: {'✅ PASSED' if baseball_matches_test else '❌ FAILED'}")
    print(f"   - Hockey: {'✅ PASSED' if hockey_matches_test else '❌ FAILED'}")
    print(f"   - Esports: {'✅ PASSED' if esports_matches_test else '❌ FAILED'}")
    print(f"3. Match Data Structure: {'✅ PASSED' if match_structure_test else '❌ FAILED'}")
    print(f"4. Refresh Matches Endpoint: {'✅ PASSED' if refresh_matches_test else '❌ FAILED'}")
    print(f"5. Update Daily Matches Endpoint: {'✅ PASSED' if update_daily_test else '❌ FAILED'}")
    print(f"6. Schedule Info Endpoint: {'✅ PASSED' if schedule_info_test else '❌ FAILED'}")
    
    # Return success if all tests passed
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())