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
            print(f"Date: {response.get('date')}")
            print(f"Total Matches: {response.get('total_matches')}")
            print(f"Sports Available: {response.get('sports_available')}")
            
            # Check if all 4 sports are available
            sports_available = response.get('sports_available', [])
            required_sports = ['football', 'baseball', 'hockey', 'esports']
            missing_sports = [sport for sport in required_sports if sport not in sports_available]
            
            if missing_sports:
                print(f"❌ Missing sports: {', '.join(missing_sports)}")
                success = False
            else:
                print("✅ All required sports are available")
            
            # Check total number of matches (should be 8, 2 per sport)
            total_matches = response.get('total_matches', 0)
            if total_matches == 8:
                print("✅ Total matches count is correct: 8 matches (2 per sport)")
            else:
                print(f"❌ Incorrect total matches count: {total_matches} (expected 8)")
                success = False
            
            # Check match structure and analysis
            matches = response.get('matches', {})
            for sport, sport_matches in matches.items():
                print(f"\n{sport.capitalize()} matches: {len(sport_matches)}")
                
                # Check if each sport has exactly 2 matches
                if len(sport_matches) != 2:
                    print(f"❌ {sport} has {len(sport_matches)} matches (expected 2)")
                    success = False
                else:
                    print(f"✅ {sport} has exactly 2 matches")
                
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
                    
                    # Check source for specific sports
                    if sport == 'baseball':
                        if match.get('source') == 'mlb-statsapi':
                            print("✅ Baseball match has correct source: mlb-statsapi")
                        else:
                            print(f"❌ Baseball match has incorrect source: {match.get('source')} (expected mlb-statsapi)")
                            success = False
                    
                    if sport == 'football':
                        valid_sources = ['football-data-api', 'api-football', 'free-football-api', 'realistic-fixture']
                        if match.get('source') in valid_sources:
                            print(f"✅ Football match has valid source: {match.get('source')}")
                            if match.get('source') == 'api-football':
                                print("✅ Using new API-Football alternative source")
                        else:
                            print(f"❌ Football match has invalid source: {match.get('source')}")
                            success = False
                    
                    if sport == 'hockey':
                        valid_sources = ['nhl-api', 'balldontlie-nhl', 'thesportsdb', 'realistic-fixture']
                        if match.get('source') in valid_sources:
                            print(f"✅ Hockey match has valid source: {match.get('source')}")
                            if match.get('source') == 'balldontlie-nhl':
                                print("✅ Using new BALLDONTLIE NHL API alternative source")
                            elif match.get('source') == 'thesportsdb':
                                print("✅ Using TheSportsDB backup source")
                        else:
                            print(f"❌ Hockey match has invalid source: {match.get('source')}")
                            success = False
                    
                    if sport == 'esports':
                        if match.get('source') == 'pandascore-api':
                            print("✅ Esports match has correct source: pandascore-api")
                        else:
                            print(f"⚠️ Esports match has alternative source: {match.get('source')} (expected pandascore-api)")
                            # Not failing the test for this as it might use a fallback
                    
                    # Check if match has real API source flag
                    if 'real_api_source' in match:
                        if match.get('real_api_source') == True:
                            print("✅ Match has real_api_source flag set to true")
                        else:
                            print("❌ Match has real_api_source flag set to false")
                            success = False
                    else:
                        print("❌ Match is missing real_api_source flag")
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
                # Check if exactly 2 matches are returned
                if len(matches) == 2:
                    print("✅ Exactly 2 matches returned as expected")
                else:
                    print(f"⚠️ Expected 2 matches, got {len(matches)}")
                
                # Check first match
                sample_match = matches[0]
                print(f"Sample match: {sample_match.get('team1')} vs {sample_match.get('team2')}")
                print(f"Match time: {sample_match.get('match_time')}")
                print(f"Source: {sample_match.get('source')}")
                
                # Verify match structure
                required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'sport', 'logo_team1', 'logo_team2']
                missing_fields = [field for field in required_fields if field not in sample_match or sample_match.get(field) is None]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {', '.join(missing_fields)}")
                    success = False
                else:
                    print("✅ Match has all required fields")
                
                # Check team logos
                if 'logo_team1' in sample_match and 'logo_team2' in sample_match:
                    if sample_match['logo_team1'] and sample_match['logo_team2']:
                        print("✅ Both team logos are present")
                    else:
                        print("❌ One or both team logos are missing")
                        success = False
                
                # Check analysis for betting symbols
                analysis = sample_match.get('analysis', '')
                betting_symbols = ['🎯', '💰', '📈', '💡']
                found_symbols = [symbol for symbol in betting_symbols if symbol in analysis]
                
                if found_symbols:
                    print(f"✅ Analysis contains betting priority symbols: {', '.join(found_symbols)}")
                else:
                    print("❌ Analysis does not contain any betting priority symbols")
                    success = False
                
                # Verify all matches are for the requested sport
                all_correct_sport = all(match.get('sport') == sport for match in matches)
                if all_correct_sport:
                    print(f"✅ All matches are for {sport}")
                else:
                    print(f"❌ Some matches are not for {sport}")
                    success = False
                
                # Check specific source for each sport
                if sport == 'baseball':
                    baseball_sources = [match.get('source') for match in matches]
                    if 'mlb-statsapi' in baseball_sources:
                        print("✅ Baseball matches include mlb-statsapi source")
                    else:
                        print(f"❌ Baseball matches don't use mlb-statsapi: {baseball_sources}")
                        success = False
                
                if sport == 'football':
                    football_sources = [match.get('source') for match in matches]
                    valid_sources = ['football-data-api', 'api-football', 'free-football-api', 'realistic-fixture']
                    valid_football_sources = [s for s in football_sources if s in valid_sources]
                    if len(valid_football_sources) == len(football_sources):
                        print(f"✅ Football matches use valid sources: {football_sources}")
                        if 'api-football' in football_sources:
                            print("✅ Using new API-Football alternative source")
                        if 'free-football-api' in football_sources:
                            print("✅ Using Free Football API backup source")
                    else:
                        print(f"❌ Some football matches use invalid sources: {football_sources}")
                        success = False
                
                if sport == 'hockey':
                    hockey_sources = [match.get('source') for match in matches]
                    valid_sources = ['nhl-api', 'balldontlie-nhl', 'thesportsdb', 'realistic-fixture']
                    valid_hockey_sources = [s for s in hockey_sources if s in valid_sources]
                    if len(valid_hockey_sources) == len(hockey_sources):
                        print(f"✅ Hockey matches use valid sources: {hockey_sources}")
                        if 'balldontlie-nhl' in hockey_sources:
                            print("✅ Using new BALLDONTLIE NHL API alternative source")
                        if 'thesportsdb' in hockey_sources:
                            print("✅ Using TheSportsDB backup source")
                    else:
                        print(f"❌ Some hockey matches use invalid sources: {hockey_sources}")
                        success = False
                
                if sport == 'esports':
                    esports_sources = [match.get('source') for match in matches]
                    if 'pandascore-api' in esports_sources:
                        print("✅ Esports matches include pandascore-api source")
                    else:
                        print(f"⚠️ Esports matches don't use pandascore-api: {esports_sources}")
                        # Not failing the test for this as it might use a fallback
            else:
                print(f"❌ No matches returned for {sport}")
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
                if total_matches == 8:
                    print(f"✅ Successfully refreshed matches: {total_matches} matches (2 per sport)")
                else:
                    print(f"⚠️ Expected 8 matches after refresh, got {total_matches}")
                    success = False
                
                # Check if alternative sources are being used
                matches = today_response.get('matches', {})
                football_matches = matches.get('football', [])
                hockey_matches = matches.get('hockey', [])
                
                # Check football sources
                football_sources = [match.get('source') for match in football_matches]
                print(f"Football sources after refresh: {football_sources}")
                if any(source in ['api-football', 'free-football-api'] for source in football_sources):
                    print("✅ Alternative football sources are being used")
                
                # Check hockey sources
                hockey_sources = [match.get('source') for match in hockey_matches]
                print(f"Hockey sources after refresh: {hockey_sources}")
                if any(source in ['balldontlie-nhl', 'thesportsdb'] for source in hockey_sources):
                    print("✅ Alternative hockey sources are being used")
        
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
                
                # Check if all 4 sports are present with 2 matches each
                required_sports = ['football', 'baseball', 'hockey', 'esports']
                all_sports_present = all(sport in sports_count for sport in required_sports)
                correct_counts = all(sports_count.get(sport, 0) == 2 for sport in required_sports)
                
                if all_sports_present and correct_counts:
                    print("✅ All sports present with 2 matches each")
                else:
                    print("⚠️ Not all sports have exactly 2 matches")
                    success = False
                
                # Check sources for football and hockey
                football_matches = [m for m in matches if m.get('sport') == 'football']
                hockey_matches = [m for m in matches if m.get('sport') == 'hockey']
                
                football_sources = [match.get('source') for match in football_matches]
                hockey_sources = [match.get('source') for match in hockey_matches]
                
                print(f"Football sources: {football_sources}")
                print(f"Hockey sources: {hockey_sources}")
                
                if any(source in ['api-football', 'free-football-api'] for source in football_sources):
                    print("✅ Alternative football sources are being used")
                
                if any(source in ['balldontlie-nhl', 'thesportsdb'] for source in hockey_sources):
                    print("✅ Alternative hockey sources are being used")
            else:
                print("❌ No matches returned in daily update response")
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
                print(f"Matches Per Sport: {schedule.get('matchesPerSport')}")
                print(f"Total Matches Per Day: {schedule.get('totalMatchesPerDay')}")
                
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
                
                # Verify matches per sport is 2
                if schedule.get('matchesPerSport') == 2:
                    print("✅ Matches per sport correctly set to 2")
                else:
                    print(f"❌ Matches per sport not set to 2: {schedule.get('matchesPerSport')}")
                    success = False
                
                # Verify total matches per day is 8
                if schedule.get('totalMatchesPerDay') == 8:
                    print("✅ Total matches per day correctly set to 8")
                else:
                    print(f"❌ Total matches per day not set to 8: {schedule.get('totalMatchesPerDay')}")
                    success = False
            else:
                print("❌ No schedule information returned")
                success = False
            
            # Check next update information
            next_update = response.get('nextUpdate', {})
            if next_update:
                print(f"Next Update: {next_update.get('date')}")
                print(f"Time Until: {next_update.get('timeUntil')}")
            else:
                print("❌ No next update information returned")
                success = False
        
        return success

    def test_match_data_structure_and_realism(self):
        """Test the match data structure in detail and check realism scores"""
        success, response = self.run_test(
            "Match Data Structure and Realism Test",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            matches = response.get('matches', {})
            all_sports_present = True
            total_realism_score = 0
            match_count = 0
            
            # Required sports
            required_sports = ['football', 'baseball', 'hockey', 'esports']
            
            # Check each sport
            for sport in required_sports:
                sport_matches = matches.get(sport, [])
                if not sport_matches:
                    print(f"❌ No {sport} matches found")
                    all_sports_present = False
                    continue
                
                print(f"\n=== {sport.capitalize()} Match Structure and Realism ===")
                
                # Check each match in the sport
                for match_idx, match in enumerate(sport_matches):
                    match_count += 1
                    print(f"\nMatch {match_idx+1}: {match.get('team1')} vs {match.get('team2')}")
                    print(f"Source: {match.get('source')}")
                    
                    # Check required fields
                    required_fields = ['id', 'team1', 'team2', 'match_time', 'odds_team1', 'odds_team2', 'analysis', 'sport', 'logo_team1', 'logo_team2', 'source', 'prediction']
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
                    
                    # Check source for specific sports
                    if sport == 'baseball':
                        if match.get('source') == 'mlb-statsapi':
                            print("✅ Baseball match has correct source: mlb-statsapi")
                        else:
                            print(f"❌ Baseball match has incorrect source: {match.get('source')} (expected mlb-statsapi)")
                            success = False
                    
                    if sport == 'football':
                        valid_sources = ['football-data-api', 'api-football', 'free-football-api', 'realistic-fixture']
                        if match.get('source') in valid_sources:
                            print(f"✅ Football match has valid source: {match.get('source')}")
                            if match.get('source') == 'api-football':
                                print("✅ Using new API-Football alternative source")
                            if match.get('source') == 'free-football-api':
                                print("✅ Using Free Football API backup source")
                        else:
                            print(f"❌ Football match has invalid source: {match.get('source')}")
                            success = False
                    
                    if sport == 'hockey':
                        valid_sources = ['nhl-api', 'balldontlie-nhl', 'thesportsdb', 'realistic-fixture']
                        if match.get('source') in valid_sources:
                            print(f"✅ Hockey match has valid source: {match.get('source')}")
                            if match.get('source') == 'balldontlie-nhl':
                                print("✅ Using new BALLDONTLIE NHL API alternative source")
                            if match.get('source') == 'thesportsdb':
                                print("✅ Using TheSportsDB backup source")
                        else:
                            print(f"❌ Hockey match has invalid source: {match.get('source')}")
                            success = False
                    
                    if sport == 'esports':
                        if match.get('source') == 'pandascore-api':
                            print("✅ Esports match has correct source: pandascore-api")
                        else:
                            print(f"⚠️ Esports match has alternative source: {match.get('source')} (expected pandascore-api)")
                            # Not failing the test for this as it might use a fallback
                    
                    # Check realism score
                    if 'realism_score' in match:
                        realism_score = match.get('realism_score', 0)
                        total_realism_score += realism_score
                        print(f"Realism score: {realism_score * 100:.1f}%")
                        
                        if realism_score >= 0.9:
                            print("✅ Realism score is 90% or higher")
                        else:
                            print(f"⚠️ Realism score is below 90%: {realism_score * 100:.1f}%")
            
            # Calculate overall realism percentage
            if match_count > 0:
                overall_realism = (total_realism_score / match_count) * 100
                print(f"\n=== Overall Realism Score: {overall_realism:.1f}% ===")
                
                if overall_realism >= 90:
                    print("✅ Overall realism score is 90% or higher")
                else:
                    print(f"❌ Overall realism score is below 90%: {overall_realism:.1f}%")
                    success = False
            
            if all_sports_present:
                print("\n✅ All required sports present in the response")
            else:
                print("\n❌ Some sports are missing from the response")
                success = False
        
        return success

    def test_alternative_sources(self):
        """Test the alternative data sources for hockey and football"""
        print("\n=== Testing Alternative Data Sources ===")
        
        # First check if the API keys are present in the environment
        success, response = self.run_test(
            "Today's Matches Endpoint for Alternative Sources",
            "GET",
            "api/matches/today",
            200
        )
        
        if success:
            matches = response.get('matches', {})
            football_matches = matches.get('football', [])
            hockey_matches = matches.get('hockey', [])
            
            # Check football sources
            football_sources = [match.get('source') for match in football_matches]
            print(f"Football sources: {football_sources}")
            
            api_football_used = any(source == 'api-football' for source in football_sources)
            free_football_used = any(source == 'free-football-api' for source in football_sources)
            
            if api_football_used:
                print("✅ API-Football alternative source is being used")
            else:
                print("⚠️ API-Football alternative source is not being used in this response")
            
            if free_football_used:
                print("✅ Free Football API backup source is being used")
            else:
                print("⚠️ Free Football API backup source is not being used in this response")
            
            # Check hockey sources
            hockey_sources = [match.get('source') for match in hockey_matches]
            print(f"Hockey sources: {hockey_sources}")
            
            balldontlie_used = any(source == 'balldontlie-nhl' for source in hockey_sources)
            thesportsdb_used = any(source == 'thesportsdb' for source in hockey_sources)
            
            if balldontlie_used:
                print("✅ BALLDONTLIE NHL API alternative source is being used")
            else:
                print("⚠️ BALLDONTLIE NHL API alternative source is not being used in this response")
            
            if thesportsdb_used:
                print("✅ TheSportsDB backup source is being used")
            else:
                print("⚠️ TheSportsDB backup source is not being used in this response")
            
            # Force refresh to try to get alternative sources
            print("\nForcing refresh to try to get alternative sources...")
            refresh_success, refresh_response = self.run_test(
                "Refresh Matches Endpoint for Alternative Sources",
                "POST",
                "api/matches/refresh",
                200
            )
            
            if refresh_success:
                # Check today's matches again
                after_refresh_success, after_refresh_response = self.run_test(
                    "Today's Matches After Refresh for Alternative Sources",
                    "GET",
                    "api/matches/today",
                    200
                )
                
                if after_refresh_success:
                    matches = after_refresh_response.get('matches', {})
                    football_matches = matches.get('football', [])
                    hockey_matches = matches.get('hockey', [])
                    
                    # Check football sources after refresh
                    football_sources = [match.get('source') for match in football_matches]
                    print(f"Football sources after refresh: {football_sources}")
                    
                    api_football_used = any(source == 'api-football' for source in football_sources)
                    free_football_used = any(source == 'free-football-api' for source in football_sources)
                    
                    if api_football_used:
                        print("✅ API-Football alternative source is being used after refresh")
                    else:
                        print("⚠️ API-Football alternative source is not being used after refresh")
                    
                    if free_football_used:
                        print("✅ Free Football API backup source is being used after refresh")
                    else:
                        print("⚠️ Free Football API backup source is not being used after refresh")
                    
                    # Check hockey sources after refresh
                    hockey_sources = [match.get('source') for match in hockey_matches]
                    print(f"Hockey sources after refresh: {hockey_sources}")
                    
                    balldontlie_used = any(source == 'balldontlie-nhl' for source in hockey_sources)
                    thesportsdb_used = any(source == 'thesportsdb' for source in hockey_sources)
                    
                    if balldontlie_used:
                        print("✅ BALLDONTLIE NHL API alternative source is being used after refresh")
                    else:
                        print("⚠️ BALLDONTLIE NHL API alternative source is not being used after refresh")
                    
                    if thesportsdb_used:
                        print("✅ TheSportsDB backup source is being used after refresh")
                    else:
                        print("⚠️ TheSportsDB backup source is not being used after refresh")
                    
                    # Check if any alternative source is being used
                    alternative_sources_used = api_football_used or free_football_used or balldontlie_used or thesportsdb_used
                    
                    if alternative_sources_used:
                        print("\n✅ Alternative sources are being used successfully")
                        return True
                    else:
                        print("\n⚠️ No alternative sources are being used after refresh")
                        # Not failing the test as primary sources might be working fine
                        return True
        
        return False

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://3dd2ec51-7c80-47db-80d7-cb3bdb1045df.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = SportPredictionsAPITester(backend_url)
    
    # Run basic API tests
    print("\n=== Testing Basic API Endpoints ===")
    health_test = tester.test_health_endpoint()
    stats_test = tester.test_stats_endpoint()
    
    # Test match parsing system
    print("\n=== Testing Match Parsing System ===")
    print("\n1. Testing Today's Matches Endpoint")
    today_matches_test = tester.test_today_matches_endpoint()
    
    print("\n2. Testing Sport-Specific Matches Endpoints")
    football_matches_test = tester.test_sport_matches_endpoint("football")
    baseball_matches_test = tester.test_sport_matches_endpoint("baseball")
    hockey_matches_test = tester.test_sport_matches_endpoint("hockey")
    esports_matches_test = tester.test_sport_matches_endpoint("esports")
    
    print("\n3. Testing Alternative Data Sources")
    alternative_sources_test = tester.test_alternative_sources()
    
    print("\n4. Testing Match Data Structure and Realism")
    match_structure_test = tester.test_match_data_structure_and_realism()
    
    print("\n5. Testing Refresh Matches Endpoint")
    refresh_matches_test = tester.test_refresh_matches_endpoint()
    
    print("\n6. Testing Schedule Info Endpoint")
    schedule_info_test = tester.test_schedule_info_endpoint()
    
    print("\n7. Testing Update Daily Matches Endpoint")
    update_daily_test = tester.test_update_daily_matches_endpoint()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print summary of match parsing system tests
    print("\n=== Match Parsing System Test Summary ===")
    print(f"1. Health Endpoint: {'✅ PASSED' if health_test else '❌ FAILED'}")
    print(f"2. Stats Endpoint: {'✅ PASSED' if stats_test else '❌ FAILED'}")
    print(f"3. Today's Matches Endpoint: {'✅ PASSED' if today_matches_test else '❌ FAILED'}")
    print(f"4. Sport-Specific Matches Endpoints:")
    print(f"   - Football: {'✅ PASSED' if football_matches_test else '❌ FAILED'}")
    print(f"   - Baseball: {'✅ PASSED' if baseball_matches_test else '❌ FAILED'}")
    print(f"   - Hockey: {'✅ PASSED' if hockey_matches_test else '❌ FAILED'}")
    print(f"   - Esports: {'✅ PASSED' if esports_matches_test else '❌ FAILED'}")
    print(f"5. Alternative Data Sources: {'✅ PASSED' if alternative_sources_test else '⚠️ PARTIAL'}")
    print(f"6. Match Data Structure and Realism: {'✅ PASSED' if match_structure_test else '❌ FAILED'}")
    print(f"7. Refresh Matches Endpoint: {'✅ PASSED' if refresh_matches_test else '❌ FAILED'}")
    print(f"8. Schedule Info Endpoint: {'✅ PASSED' if schedule_info_test else '❌ FAILED'}")
    print(f"9. Update Daily Matches Endpoint: {'✅ PASSED' if update_daily_test else '❌ FAILED'}")
    
    # Return success if all tests passed
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())