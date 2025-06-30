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
            print(f"Uptime: {response.get('uptime')} seconds")
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
            print(f"Success: {response.get('success')}")
            print(f"Total Predictions: {response.get('total_predictions')}")
            print(f"Success Rate: {response.get('success_rate')}%")
            print(f"Active Bettors: {response.get('active_bettors')}")
            print(f"Monthly Wins: {response.get('monthly_wins')}")
            
            # Check if success rate is above 90%
            if response.get('success_rate', 0) >= 90:
                print("✅ Success rate is 90% or higher")
            else:
                print(f"⚠️ Success rate is below 90%: {response.get('success_rate')}%")
                
            # Check sports stats
            sports_stats = response.get('sports_stats', {})
            for sport, stats in sports_stats.items():
                print(f"{sport.capitalize()}: {stats.get('predictions')} predictions, {stats.get('accuracy')}% accuracy")
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
            total_matches = 0
            sports_available = []
            
            # Check matches structure
            matches = response.get('matches', {})
            for sport, sport_matches in matches.items():
                sports_available.append(sport)
                total_matches += len(sport_matches)
                print(f"\n{sport.capitalize()} matches: {len(sport_matches)}")
                
                # Check each match in the sport
                for match_idx, match in enumerate(sport_matches):
                    print(f"\nMatch {match_idx+1}: {match.get('team1')} vs {match.get('team2')}")
                    
                    # Verify required fields
                    required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'prediction', 'sport', 'logo_team1', 'logo_team2', 'source']
                    missing_fields = [field for field in required_fields if field not in match or match.get(field) is None]
                    
                    if missing_fields:
                        print(f"❌ Missing required fields: {', '.join(missing_fields)}")
                        success = False
                    else:
                        print("✅ All required fields present")
                    
                    # Check team logos
                    if 'logo_team1' in match and 'logo_team2' in match:
                        if match['logo_team1'] and match['logo_team2']:
                            print("✅ Both team logos are present")
                        else:
                            print("❌ One or both team logos are missing")
                            success = False
                    
                    # Check analysis for betting symbols
                    analysis = match.get('analysis', '')
                    betting_symbols = ['🎯', '💰', '📈', '💡']
                    found_symbols = [symbol for symbol in betting_symbols if symbol in analysis]
                    
                    if found_symbols:
                        print(f"✅ Analysis contains betting priority symbols: {', '.join(found_symbols)}")
                    else:
                        print("❌ Analysis does not contain any betting priority symbols")
                        success = False
                    
                    # Check match status
                    if 'status' in match:
                        valid_statuses = ['scheduled', 'live', 'finished']
                        if match.get('status') in valid_statuses:
                            print(f"✅ Match has valid status: {match.get('status')}")
                        else:
                            print(f"❌ Match has invalid status: {match.get('status')}")
                            success = False
                    else:
                        print("❌ Match is missing status field")
                        success = False
            
            print(f"\nTotal Matches: {total_matches}")
            print(f"Sports Available: {sports_available}")
            
            # Check if all 4 sports are available
            required_sports = ['football', 'baseball', 'hockey', 'esports']
            missing_sports = [sport for sport in required_sports if sport not in sports_available]
            
            if missing_sports:
                print(f"❌ Missing sports: {', '.join(missing_sports)}")
                success = False
            else:
                print("✅ All required sports are available")
            
            # Check for mock data
            mock_sources = []
            for sport, sport_matches in matches.items():
                for match in sport_matches:
                    if match.get('source') == 'mock-generator':
                        mock_sources.append(match)
            
            if not mock_sources:
                print("✅ No mock data found - all matches are from real sources")
            else:
                print(f"❌ Found {len(mock_sources)} matches with mock data")
                success = False
        
        return success

    def test_team_logo_endpoint(self, team_name, sport):
        """Test the team logo endpoint"""
        success, response = self.run_test(
            f"Team Logo Endpoint for {team_name} ({sport})",
            "GET",
            f"api/logos/team/{team_name}/{sport}",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Team: {response.get('team')}")
            print(f"Sport: {response.get('sport')}")
            
            logo_url = response.get('logo_url')
            if logo_url:
                print(f"Logo URL: {logo_url}")
                print("✅ Logo URL is present")
                
                # Check if URL is valid
                if logo_url.startswith('http'):
                    print("✅ Logo URL is a valid URL")
                else:
                    print("❌ Logo URL is not a valid URL")
                    success = False
            else:
                print("❌ Logo URL is missing")
                success = False
        
        return success

    def test_all_logos_endpoint(self):
        """Test the all logos endpoint"""
        success, response = self.run_test(
            "All Logos Endpoint",
            "GET",
            "api/logos/all",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            
            logos = response.get('logos', [])
            logo_count = response.get('count', 0)
            
            if logos and logo_count > 0:
                print(f"✅ Found {logo_count} logos in database")
                
                # Check a sample logo
                if len(logos) > 0:
                    sample_logo = logos[0]
                    print(f"Sample logo: {sample_logo.get('team_name')} ({sample_logo.get('sport')})")
                    print(f"Logo URL: {sample_logo.get('logo_url')}")
                    
                    # Check required fields
                    required_fields = ['team_name', 'sport', 'logo_url', 'updated_at']
                    missing_fields = [field for field in required_fields if field not in sample_logo]
                    
                    if missing_fields:
                        print(f"❌ Sample logo missing required fields: {', '.join(missing_fields)}")
                        success = False
                    else:
                        print("✅ Sample logo has all required fields")
            else:
                print("⚠️ No logos found in database yet")
        
        return success

    def test_update_all_logos_endpoint(self):
        """Test the update all logos endpoint"""
        success, response = self.run_test(
            "Update All Logos Endpoint",
            "POST",
            "api/logos/update-all",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Message: {response.get('message')}")
            
            # Verify logos were updated by checking all logos endpoint
            logos_success, logos_response = self.run_test(
                "All Logos After Update",
                "GET",
                "api/logos/all",
                200
            )
            
            if logos_success:
                logos = logos_response.get('logos', [])
                logo_count = logos_response.get('count', 0)
                
                if logos and logo_count > 0:
                    print(f"✅ Found {logo_count} logos after update")
                else:
                    print("⚠️ No logos found after update")
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
            
            # Check if message mentions logo updates
            message = response.get('message', '')
            if 'logo' in message.lower():
                print("✅ Response message mentions logo updates")
            else:
                print("⚠️ Response message doesn't mention logo updates")
            
            # Verify matches were refreshed with logos by checking today's matches
            matches_success, matches_response = self.run_test(
                "Today's Matches After Refresh",
                "GET",
                "api/matches/today",
                200
            )
            
            if matches_success:
                matches = matches_response.get('matches', {})
                
                # Check if matches have logos
                all_have_logos = True
                for sport, sport_matches in matches.items():
                    for match in sport_matches:
                        if not match.get('logo_team1') or not match.get('logo_team2'):
                            all_have_logos = False
                            break
                
                if all_have_logos:
                    print("✅ All matches have team logos after refresh")
                else:
                    print("❌ Some matches are missing team logos after refresh")
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
            
            # Check schedule information
            schedule = response.get('schedule', {})
            if schedule:
                print(f"Morning Update: {schedule.get('morningUpdate')}")
                print(f"Evening Update: {schedule.get('eveningUpdate')}")
                print(f"Old Match Cleanup: {schedule.get('oldMatchCleanup')}")
                print(f"Timezone: {schedule.get('timezone')}")
                print(f"Real Data Only: {schedule.get('realDataOnly')}")
                print(f"Auto Logo Fetch: {schedule.get('autoLogoFetch')}")
                
                # Verify schedule is set for 09:00 and 19:00 MSK
                if '09:00 МСК' in schedule.get('morningUpdate', '') and '19:00 МСК' in schedule.get('eveningUpdate', ''):
                    print("✅ Schedule correctly set for 09:00 МСК (morning) and 19:00 МСК (evening)")
                else:
                    print(f"❌ Schedule not set correctly: Morning: {schedule.get('morningUpdate')}, Evening: {schedule.get('eveningUpdate')}")
                    success = False
                
                # Verify timezone is Moscow
                if schedule.get('timezone') == 'Europe/Moscow':
                    print("✅ Timezone correctly set to Europe/Moscow")
                else:
                    print(f"❌ Timezone not set to Europe/Moscow: {schedule.get('timezone')}")
                    success = False
                
                # Verify real data only is true
                if schedule.get('realDataOnly') == True:
                    print("✅ Real data only flag is set to true")
                else:
                    print("❌ Real data only flag is not set to true")
                    success = False
                
                # Verify auto logo fetch is true
                if schedule.get('autoLogoFetch') == True:
                    print("✅ Auto logo fetch flag is set to true")
                else:
                    print("❌ Auto logo fetch flag is not set to true")
                    success = False
            else:
                print("❌ No schedule information returned")
                success = False
        
        return success

    def test_time_conversion(self):
        """Test the time conversion by checking match times"""
        success, response = self.run_test(
            "Today's Matches for Time Conversion Test",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            matches = response.get('matches', {})
            all_times_valid = True
            
            for sport, sport_matches in matches.items():
                for match in sport_matches:
                    match_time = match.get('match_time')
                    if match_time:
                        try:
                            # Try to parse the time to verify it's valid
                            match_date = datetime.fromisoformat(match_time.replace('Z', '+00:00'))
                            print(f"✅ Valid match time for {match.get('team1')} vs {match.get('team2')}: {match_time}")
                        except (ValueError, TypeError):
                            print(f"❌ Invalid match time format for {match.get('team1')} vs {match.get('team2')}: {match_time}")
                            all_times_valid = False
                    else:
                        print(f"❌ Missing match time for {match.get('team1')} vs {match.get('team2')}")
                        all_times_valid = False
            
            if all_times_valid:
                print("\n✅ All match times are in valid format")
            else:
                print("\n❌ Some match times are invalid or missing")
                success = False
        
        return success

    def test_match_status_system(self):
        """Test the match status system"""
        success, response = self.run_test(
            "Today's Matches for Status System Test",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            matches = response.get('matches', {})
            all_statuses_valid = True
            status_counts = {'scheduled': 0, 'live': 0, 'finished': 0}
            
            for sport, sport_matches in matches.items():
                for match in sport_matches:
                    status = match.get('status')
                    if status:
                        if status in ['scheduled', 'live', 'finished']:
                            status_counts[status] += 1
                            print(f"✅ Valid status for {match.get('team1')} vs {match.get('team2')}: {status}")
                        else:
                            print(f"❌ Invalid status for {match.get('team1')} vs {match.get('team2')}: {status}")
                            all_statuses_valid = False
                    else:
                        print(f"❌ Missing status for {match.get('team1')} vs {match.get('team2')}")
                        all_statuses_valid = False
            
            if all_statuses_valid:
                print("\n✅ All match statuses are valid")
                print(f"Status distribution: Scheduled: {status_counts['scheduled']}, Live: {status_counts['live']}, Finished: {status_counts['finished']}")
            else:
                print("\n❌ Some match statuses are invalid or missing")
                success = False
        
        return success

    def test_logo_service_fallback_chain(self):
        """Test the logo service fallback chain with various team names"""
        # Test with known teams
        known_teams = [
            ('Real Madrid', 'football'),
            ('New York Yankees', 'baseball'),
            ('Toronto Maple Leafs', 'hockey'),
            ('Natus Vincere', 'esports')
        ]
        
        # Test with unknown teams to check fallback
        unknown_teams = [
            ('Nonexistent FC', 'football'),
            ('Imaginary Bears', 'baseball'),
            ('Fantasy Knights', 'hockey'),
            ('Virtual Gamers', 'esports')
        ]
        
        all_success = True
        
        # Test known teams
        print("\n=== Testing Logo Service with Known Teams ===")
        for team, sport in known_teams:
            success = self.test_team_logo_endpoint(team, sport)
            all_success = all_success and success
        
        # Test unknown teams (should use fallback)
        print("\n=== Testing Logo Service Fallback with Unknown Teams ===")
        for team, sport in unknown_teams:
            success = self.test_team_logo_endpoint(team, sport)
            all_success = all_success and success
        
        return all_success

    def test_logo_stats_endpoint(self):
        """Test the logo stats endpoint"""
        success, response = self.run_test(
            "Logo Stats Endpoint",
            "GET",
            "api/logos/stats",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            
            # Check logo statistics
            total_logos = response.get('total_logos', 0)
            real_logos = response.get('real_logos', 0)
            placeholder_logos = response.get('placeholder_logos', 0)
            percentage_real = response.get('percentage_real', 0)
            
            print(f"Total Logos: {total_logos}")
            print(f"Real Logos: {real_logos}")
            print(f"Placeholder Logos: {placeholder_logos}")
            print(f"Percentage Real: {percentage_real}%")
            
            # Check if total matches sum of real and placeholder
            if total_logos == real_logos + placeholder_logos:
                print("✅ Total logos count is correct")
            else:
                print("❌ Total logos count doesn't match sum of real and placeholder")
                success = False
            
            # Check if percentage is calculated correctly
            if total_logos > 0:
                expected_percentage = round((real_logos / total_logos) * 100)
                if expected_percentage == percentage_real:
                    print("✅ Percentage real is calculated correctly")
                else:
                    print(f"❌ Percentage real calculation is incorrect: expected {expected_percentage}, got {percentage_real}")
                    success = False
            
            # Check sport breakdown
            by_sport = response.get('by_sport', [])
            if by_sport:
                print("\nLogo stats by sport:")
                for sport_stats in by_sport:
                    sport = sport_stats.get('_id', 'unknown')
                    count = sport_stats.get('count', 0)
                    real = sport_stats.get('real_logos', 0)
                    placeholder = sport_stats.get('placeholder_logos', 0)
                    
                    print(f"{sport.capitalize()}: {count} total, {real} real, {placeholder} placeholder")
                    
                    # Verify counts for each sport
                    if count == real + placeholder:
                        print(f"✅ {sport.capitalize()} counts are correct")
                    else:
                        print(f"❌ {sport.capitalize()} counts don't match: {count} != {real} + {placeholder}")
                        success = False
            else:
                print("⚠️ No sport breakdown available")
        
        return success

    def test_logo_cleanup_endpoint(self):
        """Test the logo cleanup endpoint"""
        success, response = self.run_test(
            "Logo Cleanup Endpoint",
            "POST",
            "api/logos/cleanup",
            200
        )
        
        if success:
            print(f"Success: {response.get('success')}")
            print(f"Message: {response.get('message')}")
            
            # Verify cleanup was successful by checking logo stats
            stats_success, stats_response = self.run_test(
                "Logo Stats After Cleanup",
                "GET",
                "api/logos/stats",
                200
            )
            
            if stats_success:
                total_logos = stats_response.get('total_logos', 0)
                print(f"Total logos after cleanup: {total_logos}")
                
                # We can't verify exact counts since we don't know how many should be deleted
                # But we can verify the endpoint works and returns valid data
                if 'total_logos' in stats_response and 'real_logos' in stats_response:
                    print("✅ Cleanup completed successfully and stats are available")
                else:
                    print("❌ Stats after cleanup are incomplete")
                    success = False
            else:
                print("❌ Failed to get stats after cleanup")
                success = False
        
        return success

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://201f3f98-e4ac-48af-b69b-9cb8b025ccca.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = SportPredictionsAPITester(backend_url)
    
    # Run basic API tests
    print("\n=== Testing Basic API Endpoints ===")
    health_test = tester.test_health_endpoint()
    
    # Test new features
    print("\n=== Testing Fixed Time Display ===")
    schedule_info_test = tester.test_schedule_info_endpoint()
    
    print("\n=== Testing Automatic Logo Fetching ===")
    logo_service_test = tester.test_logo_service_fallback_chain()
    all_logos_test = tester.test_all_logos_endpoint()
    update_logos_test = tester.test_update_all_logos_endpoint()
    
    print("\n=== Testing Enhanced Time Parsing ===")
    time_conversion_test = tester.test_time_conversion()
    
    print("\n=== Testing Match Status System ===")
    match_status_test = tester.test_match_status_system()
    
    print("\n=== Testing Today's Matches with Logos ===")
    today_matches_test = tester.test_today_matches_endpoint()
    
    print("\n=== Testing Refresh Matches with Logo Updates ===")
    refresh_matches_test = tester.test_refresh_matches_endpoint()
    
    # Test logo statistics
    print("\n=== Testing Logo Statistics ===")
    logo_stats_test = tester.test_logo_stats_endpoint()
    
    # Test logo cleanup
    print("\n=== Testing Logo Cleanup ===")
    logo_cleanup_test = tester.test_logo_cleanup_endpoint()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print summary of tests
    print("\n=== Backend Improvements Test Summary ===")
    print(f"1. Health Endpoint: {'✅ PASSED' if health_test else '❌ FAILED'}")
    print(f"2. Fixed Time Display (09:00 и 19:00 МСК): {'✅ PASSED' if schedule_info_test else '❌ FAILED'}")
    print(f"3. Automatic Logo Fetching:")
    print(f"   - Logo Service Fallback Chain: {'✅ PASSED' if logo_service_test else '❌ FAILED'}")
    print(f"   - All Logos Endpoint: {'✅ PASSED' if all_logos_test else '❌ FAILED'}")
    print(f"   - Update All Logos Endpoint: {'✅ PASSED' if update_logos_test else '❌ FAILED'}")
    print(f"4. Enhanced Time Parsing: {'✅ PASSED' if time_conversion_test else '❌ FAILED'}")
    print(f"5. Match Status System: {'✅ PASSED' if match_status_test else '❌ FAILED'}")
    print(f"6. Today's Matches with Logos: {'✅ PASSED' if today_matches_test else '❌ FAILED'}")
    print(f"7. Refresh Matches with Logo Updates: {'✅ PASSED' if refresh_matches_test else '❌ FAILED'}")
    print(f"8. Logo Statistics: {'✅ PASSED' if logo_stats_test else '❌ FAILED'}")
    print(f"9. Logo Cleanup: {'✅ PASSED' if logo_cleanup_test else '❌ FAILED'}")
    
    # Return success if all tests passed
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())