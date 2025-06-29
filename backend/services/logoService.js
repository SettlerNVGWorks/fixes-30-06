const axios = require('axios');
const { getDatabase } = require('../database_mongo');

class LogoService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours cache
    
    // Logo sources with different APIs
    this.logoSources = {
      // Sports logos API
      sportsLogos: {
        url: 'https://www.thesportsdb.com/api/v1/json/1',
        enabled: true
      },
      // Logo.dev API for sports logos
      logoDev: {
        url: 'https://logo.dev',
        enabled: true
      },
      // Wikipedia API for team logos
      wikipedia: {
        url: 'https://en.wikipedia.org/w/api.php',
        enabled: true
      },
      // Fallback to placeholder service
      placeholder: {
        url: 'https://via.placeholder.com',
        enabled: true
      }
    };

    this.teamNameMappings = {
      // MLB team mappings
      'New York Yankees': ['yankees', 'ny yankees', 'new york yankees'],
      'Boston Red Sox': ['red sox', 'boston red sox', 'redsox'],
      'Los Angeles Dodgers': ['dodgers', 'la dodgers', 'los angeles dodgers'],
      'Houston Astros': ['astros', 'houston astros'],
      'Tampa Bay Rays': ['rays', 'tampa bay rays', 'tb rays'],
      
      // NHL team mappings
      'Toronto Maple Leafs': ['maple leafs', 'toronto maple leafs', 'leafs'],
      'Montreal Canadiens': ['canadiens', 'montreal canadiens', 'habs'],
      'Boston Bruins': ['bruins', 'boston bruins'],
      'New York Rangers': ['rangers', 'ny rangers', 'new york rangers'],
      
      // Football team mappings
      'Real Madrid': ['real madrid', 'madrid', 'real'],
      'Barcelona': ['barcelona', 'barca', 'fc barcelona'],
      'Manchester City': ['man city', 'manchester city', 'city'],
      'Manchester United': ['man united', 'manchester united', 'united'],
      
      // Esports team mappings
      'Natus Vincere': ['navi', 'natus vincere', 'na-vi'],
      'G2 Esports': ['g2', 'g2 esports'],
      'Team Liquid': ['liquid', 'team liquid', 'tl'],
      'FaZe Clan': ['faze', 'faze clan']
    };
  }

  // Get team logo with automatic fallback chain
  async getTeamLogo(teamName, sport) {
    try {
      // Check cache first
      const cacheKey = `${teamName}_${sport}`;
      if (this.isCacheValid(cacheKey)) {
        return this.getCachedData(cacheKey);
      }

      // Try multiple sources
      let logoUrl = await this.getLogoFromSportsDB(teamName, sport);
      
      if (!logoUrl) {
        logoUrl = await this.getLogoFromWikipedia(teamName, sport);
      }
      
      if (!logoUrl) {
        logoUrl = await this.getLogoFromLogoDev(teamName, sport);
      }
      
      if (!logoUrl) {
        logoUrl = this.generatePlaceholderLogo(teamName, sport);
      }

      // Save to database and cache
      await this.saveLogoToDatabase(teamName, sport, logoUrl);
      this.setCacheData(cacheKey, logoUrl);
      
      return logoUrl;

    } catch (error) {
      console.error(`Error getting logo for ${teamName}:`, error);
      return this.generatePlaceholderLogo(teamName, sport);
    }
  }

  // Get logo from TheSportsDB API
  async getLogoFromSportsDB(teamName, sport) {
    try {
      const searchName = this.getSearchableName(teamName);
      const sportMapping = this.getSportsDBSportName(sport);
      
      const response = await axios.get(
        `${this.logoSources.sportsLogos.url}/searchteams.php?t=${encodeURIComponent(searchName)}`,
        { timeout: 5000 }
      );

      if (response.data && response.data.teams && response.data.teams.length > 0) {
        const team = response.data.teams[0];
        
        // Try different logo fields
        const logoUrl = team.strTeamBadge || team.strTeamLogo || team.strTeamBanner;
        
        if (logoUrl && this.isValidImageUrl(logoUrl)) {
          console.log(`✅ Found logo for ${teamName} from SportsDB: ${logoUrl}`);
          return logoUrl;
        }
      }
    } catch (error) {
      console.log(`⚠️ SportsDB failed for ${teamName}:`, error.message);
    }
    
    return null;
  }

  // Get logo from Wikipedia API
  async getLogoFromWikipedia(teamName, sport) {
    try {
      const searchName = this.getWikipediaSearchName(teamName, sport);
      
      // Search for the page
      const searchResponse = await axios.get(this.logoSources.wikipedia.url, {
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: searchName,
          srlimit: 1
        },
        timeout: 5000
      });

      if (searchResponse.data.query.search.length > 0) {
        const pageTitle = searchResponse.data.query.search[0].title;
        
        // Get page images
        const imageResponse = await axios.get(this.logoSources.wikipedia.url, {
          params: {
            action: 'query',
            format: 'json',
            titles: pageTitle,
            prop: 'pageimages',
            pithumbsize: 300
          },
          timeout: 5000
        });

        const pages = imageResponse.data.query.pages;
        const page = Object.values(pages)[0];
        
        if (page && page.thumbnail && page.thumbnail.source) {
          const logoUrl = page.thumbnail.source;
          console.log(`✅ Found logo for ${teamName} from Wikipedia: ${logoUrl}`);
          return logoUrl;
        }
      }
    } catch (error) {
      console.log(`⚠️ Wikipedia failed for ${teamName}:`, error.message);
    }
    
    return null;
  }

  // Get logo from Logo.dev (searches for corporate logos)
  async getLogoFromLogoDev(teamName, sport) {
    try {
      // Logo.dev works better with simplified names
      const simpleName = teamName.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      
      const logoUrl = `https://logo.dev/${simpleName}?token=pk_demo&format=png&size=200`;
      
      // Test if the logo exists
      const testResponse = await axios.head(logoUrl, { timeout: 3000 });
      
      if (testResponse.status === 200) {
        console.log(`✅ Found logo for ${teamName} from Logo.dev: ${logoUrl}`);
        return logoUrl;
      }
    } catch (error) {
      console.log(`⚠️ Logo.dev failed for ${teamName}:`, error.message);
    }
    
    return null;
  }

  // Generate a high-quality placeholder logo
  generatePlaceholderLogo(teamName, sport) {
    const sportEmojis = {
      football: '⚽',
      baseball: '⚾', 
      hockey: '🏒',
      esports: '🎮'
    };
    
    const sportColors = {
      football: '28A745',
      baseball: '007BFF',
      hockey: '6F42C1',
      esports: 'DC3545'
    };
    
    const emoji = sportEmojis[sport] || '🏆';
    const color = sportColors[sport] || '28A745';
    const initials = this.getTeamInitials(teamName);
    
    const logoUrl = `https://via.placeholder.com/200x200/${color}/FFFFFF?text=${encodeURIComponent(initials + ' ' + emoji)}`;
    
    console.log(`📝 Generated placeholder logo for ${teamName}: ${logoUrl}`);
    return logoUrl;
  }

  // Get team initials for placeholder
  getTeamInitials(teamName) {
    return teamName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 3)
      .join('');
  }

  // Get searchable name with mappings
  getSearchableName(teamName) {
    const mappings = this.teamNameMappings[teamName];
    return mappings ? mappings[0] : teamName;
  }

  // Get Wikipedia search name with sport context
  getWikipediaSearchName(teamName, sport) {
    const sportSuffixes = {
      baseball: ' MLB baseball team',
      hockey: ' NHL hockey team', 
      football: ' football club',
      esports: ' esports team'
    };
    
    return teamName + (sportSuffixes[sport] || '');
  }

  // Map our sport names to SportsDB sport names
  getSportsDBSportName(sport) {
    const mapping = {
      baseball: 'Baseball',
      hockey: 'Ice Hockey',
      football: 'Soccer',
      esports: 'Esports'
    };
    
    return mapping[sport] || sport;
  }

  // Validate if URL is a valid image
  isValidImageUrl(url) {
    if (!url) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('image') || 
           urlLower.includes('logo') ||
           urlLower.includes('badge');
  }

  // Cache management
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  setCacheData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Save logo to database
  async saveLogoToDatabase(teamName, sport, logoUrl) {
    try {
      const db = getDatabase();
      
      await db.collection('team_logos').updateOne(
        { team_name: teamName, sport: sport },
        {
          $set: {
            team_name: teamName,
            sport: sport,
            logo_url: logoUrl,
            updated_at: new Date(),
            source: 'auto-fetched'
          }
        },
        { upsert: true }
      );
      
      console.log(`💾 Saved logo for ${teamName} (${sport}) to database`);
    } catch (error) {
      console.error(`❌ Error saving logo to database:`, error);
    }
  }

  // Get logo from database first, then fetch if needed
  async getLogoFromDatabase(teamName, sport) {
    try {
      const db = getDatabase();
      
      const existingLogo = await db.collection('team_logos').findOne({
        team_name: teamName,
        sport: sport
      });
      
      if (existingLogo && existingLogo.logo_url) {
        // Check if logo is not too old (refresh weekly)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (existingLogo.updated_at > weekAgo) {
          console.log(`💾 Using cached logo for ${teamName} from database`);
          return existingLogo.logo_url;
        }
      }
    } catch (error) {
      console.error(`❌ Error getting logo from database:`, error);
    }
    
    return null;
  }

  // Bulk update logos for all teams
  async updateAllTeamLogos() {
    try {
      const db = getDatabase();
      
      // Get all unique teams from matches
      const teams = await db.collection('matches').aggregate([
        {
          $group: {
            _id: null,
            teams: {
              $addToSet: {
                $map: {
                  input: [
                    { name: '$team1', sport: '$sport' },
                    { name: '$team2', sport: '$sport' }
                  ],
                  as: 'team',
                  in: '$$team'
                }
              }
            }
          }
        }
      ]).toArray();
      
      if (teams.length > 0) {
        const flatTeams = teams[0].teams.flat();
        
        console.log(`🔄 Updating logos for ${flatTeams.length} teams...`);
        
        for (const team of flatTeams) {
          if (team.name && team.sport) {
            await this.getTeamLogo(team.name, team.sport);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`✅ Completed logo update for all teams`);
      }
    } catch (error) {
      console.error(`❌ Error updating all team logos:`, error);
    }
  }

  // Get logo with database check first
  async getTeamLogoWithDatabase(teamName, sport) {
    // Try database first
    let logoUrl = await this.getLogoFromDatabase(teamName, sport);
    
    if (!logoUrl) {
      // Fetch new logo
      logoUrl = await this.getTeamLogo(teamName, sport);
    }
    
    return logoUrl;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Logo service cache cleared');
  }
}

module.exports = LogoService;