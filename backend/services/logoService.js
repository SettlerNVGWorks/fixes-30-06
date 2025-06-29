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
      'Liverpool': ['liverpool', 'lfc'],
      
      // Esports team mappings
      'Natus Vincere': ['navi', 'natus vincere', 'na-vi'],
      'G2 Esports': ['g2', 'g2 esports'],
      'Team Liquid': ['liquid', 'team liquid', 'tl'],
      'FaZe Clan': ['faze', 'faze clan']
    };

    // Direct logo URLs for popular teams
    this.directLogos = {
      // Football teams
      'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/400px-Real_Madrid_CF.svg.png',
      'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/300px-FC_Barcelona_%28crest%29.svg.png',
      'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/300px-Manchester_City_FC_badge.svg.png',
      'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/300px-Manchester_United_FC_crest.svg.png',
      'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/300px-Liverpool_FC.svg.png',
      'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/300px-Arsenal_FC.svg.png',
      'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/300px-Chelsea_FC.svg.png',
      'Paris Saint-Germain': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/300px-Paris_Saint-Germain_F.C..svg.png',
      'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_München_logo_%282017%29.svg/300px-FC_Bayern_München_logo_%282017%29.svg.png',
      'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Juventus_FC_logo_%282017%29.svg/300px-Juventus_FC_logo_%282017%29.svg.png',
      
      // MLB teams  
      'New York Yankees': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/NewYorkYankees_PrimaryLogo.svg/300px-NewYorkYankees_PrimaryLogo.svg.png',
      'Boston Red Sox': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/RedSoxPrimary_HangingSocks.svg/300px-RedSoxPrimary_HangingSocks.svg.png',
      'Los Angeles Dodgers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Los_Angeles_Dodgers_Logo.svg/300px-Los_Angeles_Dodgers_Logo.svg.png',
      'Houston Astros': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Houston-Astros-Logo.svg/300px-Houston-Astros-Logo.svg.png',
      'Tampa Bay Rays': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Tampa_Bay_Rays_logo_2019.svg/300px-Tampa_Bay_Rays_logo_2019.svg.png',
      'Cleveland Guardians': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Cleveland_Guardians_cap_logo.svg/300px-Cleveland_Guardians_cap_logo.svg.png',
      'St. Louis Cardinals': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/St._Louis_Cardinals_insignia_logo.svg/300px-St._Louis_Cardinals_insignia_logo.svg.png',
      'Pittsburgh Pirates': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Pittsburgh_Pirates_logo_2014.svg/300px-Pittsburgh_Pirates_logo_2014.svg.png',
      'New York Mets': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/New_York_Mets_Insignia.svg/330px-New_York_Mets_Insignia.svg.png',
      
      // NHL teams
      'Toronto Maple Leafs': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b6/Toronto_Maple_Leafs_2016_logo.svg/300px-Toronto_Maple_Leafs_2016_logo.svg.png',
      'Montreal Canadiens': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Montreal_Canadiens.svg/330px-Montreal_Canadiens.svg.png',
      'Boston Bruins': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Boston_Bruins.svg/300px-Boston_Bruins.svg.png',
      'New York Rangers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/New_York_Rangers.svg/300px-New_York_Rangers.svg.png',
      'Chicago Blackhawks': 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Chicago_Blackhawks_logo.svg/300px-Chicago_Blackhawks_logo.svg.png',
      'Detroit Red Wings': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Detroit_Red_Wings_logo.svg/300px-Detroit_Red_Wings_logo.svg.png',
      
      // Esports teams  
      'FaZe Clan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/FaZe_Clan_2025_svg.svg/330px-FaZe_Clan_2025_svg.svg.png',
      'Team Liquid': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Team_Liquid_logo_2017.svg/300px-Team_Liquid_logo_2017.svg.png',
      'Natus Vincere': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Natus_Vincere_Logo_2021.svg/300px-Natus_Vincere_Logo_2021.svg.png',
      'G2 Esports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/G2_Esports_logo.svg/300px-G2_Esports_logo.svg.png',
      'Cloud9': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Cloud9_logo.svg/300px-Cloud9_logo.svg.png',
      'TSM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Team_SoloMid_logo.svg/300px-Team_SoloMid_logo.svg.png',
      'Fnatic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Fnatic_logo.svg/300px-Fnatic_logo.svg.png',
      'Astralis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Astralis_logo.svg/300px-Astralis_logo.svg.png',
      'SK Telecom T1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/SK_Telecom_T1_logo.svg/300px-SK_Telecom_T1_logo.svg.png',
      'Evil Geniuses': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Evil_Geniuses.svg/300px-Evil_Geniuses.svg.png',
      'NiP': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ninjas_in_Pyjamas_logo.svg/300px-Ninjas_in_Pyjamas_logo.svg.png',
      'Ninjas in Pyjamas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Ninjas_in_Pyjamas_logo.svg/300px-Ninjas_in_Pyjamas_logo.svg.png',
      'Team SoloMid': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Team_SoloMid_logo.svg/300px-Team_SoloMid_logo.svg.png',
      'Virtus.pro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Virtus.pro_logo.svg/300px-Virtus.pro_logo.svg.png',
      'mousesports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mousesports_logo.svg/300px-Mousesports_logo.svg.png',
      'MOUZ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mousesports_logo.svg/300px-Mousesports_logo.svg.png',
      'Team Vitality': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Team_Vitality_logo.svg/300px-Team_Vitality_logo.svg.png',
      'Vitality': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Team_Vitality_logo.svg/300px-Team_Vitality_logo.svg.png',
      'ENCE': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/ENCE_eSports_logo.svg/300px-ENCE_eSports_logo.svg.png',
      'BIG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/BIG_esports_logo.svg/300px-BIG_esports_logo.svg.png',
      'North': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/North_%28esports%29_logo.svg/300px-North_%28esports%29_logo.svg.png',
      'Complexity Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Complexity_Gaming_logo.svg/300px-Complexity_Gaming_logo.svg.png',
      'coL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Complexity_Gaming_logo.svg/300px-Complexity_Gaming_logo.svg.png',
      'OG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/OG_logo.svg/300px-OG_logo.svg.png',
      'Alliance': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Alliance_%28esports%29_logo.svg/300px-Alliance_%28esports%29_logo.svg.png',
      'Dignitas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Team_Dignitas_logo.svg/300px-Team_Dignitas_logo.svg.png',
      'Team Dignitas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Team_Dignitas_logo.svg/300px-Team_Dignitas_logo.svg.png',
      'Immortals': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Immortals_logo.svg/300px-Immortals_logo.svg.png',
      'MIBR': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/MIBR_logo.svg/300px-MIBR_logo.svg.png',
      'Luminosity Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Luminosity_Gaming_logo.svg/300px-Luminosity_Gaming_logo.svg.png',
      'LG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Luminosity_Gaming_logo.svg/300px-Luminosity_Gaming_logo.svg.png',
      'Renegades': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Renegades_%28esports%29_logo.svg/300px-Renegades_%28esports%29_logo.svg.png',
      'Heroic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Heroic_%28esports%29_logo.svg/300px-Heroic_%28esports%29_logo.svg.png',
      'MAD Lions': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MAD_Lions_logo.svg/300px-MAD_Lions_logo.svg.png',
      'Rogue': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Rogue_%28esports%29_logo.svg/300px-Rogue_%28esports%29_logo.svg.png',
      'Splyce': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Splyce_logo.svg/300px-Splyce_logo.svg.png',
      'FlashGaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Flash_Gaming_logo.svg/300px-Flash_Gaming_logo.svg.png',
      'FlyQuest': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/FlyQuest_logo.svg/300px-FlyQuest_logo.svg.png',
      'Echo Fox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Echo_Fox_logo.svg/300px-Echo_Fox_logo.svg.png',
      '100 Thieves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/100_Thieves_logo.svg/300px-100_Thieves_logo.svg.png',
      '100T': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/100_Thieves_logo.svg/300px-100_Thieves_logo.svg.png',
      'Counter Logic Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Counter_Logic_Gaming_logo.svg/300px-Counter_Logic_Gaming_logo.svg.png',
      'CLG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Counter_Logic_Gaming_logo.svg/300px-Counter_Logic_Gaming_logo.svg.png',
      'Optic Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/OpTic_Gaming_logo.svg/300px-OpTic_Gaming_logo.svg.png',
      'OpTic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/OpTic_Gaming_logo.svg/300px-OpTic_Gaming_logo.svg.png',
      'Sentinels': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Sentinels_logo.svg/300px-Sentinels_logo.svg.png',
      'Version1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Version1_logo.svg/300px-Version1_logo.svg.png',
      'V1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Version1_logo.svg/300px-Version1_logo.svg.png',
      'Gen.G': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Gen.G_logo.svg/300px-Gen.G_logo.svg.png',
      'GenG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Gen.G_logo.svg/300px-Gen.G_logo.svg.png',
      'DRX': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/DRX_logo.svg/300px-DRX_logo.svg.png',
      'T1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/SK_Telecom_T1_logo.svg/300px-SK_Telecom_T1_logo.svg.png',
      'DAMWON KIA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/DAMWON_KIA_logo.svg/300px-DAMWON_KIA_logo.svg.png',
      'DWG KIA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/DAMWON_KIA_logo.svg/300px-DAMWON_KIA_logo.svg.png',
      'Edward Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Edward_Gaming_logo.svg/300px-Edward_Gaming_logo.svg.png',
      'EDG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Edward_Gaming_logo.svg/300px-Edward_Gaming_logo.svg.png',
      'Royal Never Give Up': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Royal_Never_Give_Up_logo.svg/300px-Royal_Never_Give_Up_logo.svg.png',
      'RNG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Royal_Never_Give_Up_logo.svg/300px-Royal_Never_Give_Up_logo.svg.png',
      'PSG Talon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/PSG_Talon_logo.svg/300px-PSG_Talon_logo.svg.png',
      'Beyond Gaming': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Beyond_Gaming_logo.svg/300px-Beyond_Gaming_logo.svg.png',
      'BYG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Beyond_Gaming_logo.svg/300px-Beyond_Gaming_logo.svg.png'
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

      // First try direct logo URLs for known teams
      if (this.directLogos[teamName]) {
        const directUrl = this.directLogos[teamName];
        console.log(`✅ Using direct logo for ${teamName}: ${directUrl}`);
        await this.saveLogoToDatabase(teamName, sport, directUrl);
        this.setCacheData(cacheKey, directUrl);
        return directUrl;
      }

      // Try multiple API sources for unknown teams
      let logoUrl = await this.getLogoFromSportsDB(teamName, sport);
      
      if (!logoUrl) {
        logoUrl = await this.getLogoFromWikipedia(teamName, sport);
      }
      
      if (!logoUrl) {
        logoUrl = await this.getLogoFromLogoDev(teamName, sport);
      }
      
      // If still no logo found, try advanced placeholder generation
      if (!logoUrl) {
        logoUrl = await this.generateAdvancedLogo(teamName, sport);
      }

      // Save to database and cache
      await this.saveLogoToDatabase(teamName, sport, logoUrl);
      this.setCacheData(cacheKey, logoUrl);
      
      return logoUrl;

    } catch (error) {
      console.error(`Error getting logo for ${teamName}:`, error);
      return await this.generateAdvancedLogo(teamName, sport);
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
  // Generate placeholder logo with multiple options
  generatePlaceholderLogo(teamName, sport) {
    // First try to create a more professional logo using different services
    const logoOptions = [
      this.generateShieldLogo(teamName, sport),
      this.generateModernLogo(teamName, sport),
      this.generateMinimalLogo(teamName, sport)
    ];
    
    // For now, use the modern logo approach
    return this.generateModernLogo(teamName, sport);
  }

  // Generate a modern team logo with better styling
  generateModernLogo(teamName, sport) {
    const sportConfigs = {
      football: {
        emoji: '⚽',
        bgColor: '1a5f3f', // Dark green
        textColor: 'FFFFFF',
        accentColor: '28a745'
      },
      baseball: {
        emoji: '⚾', 
        bgColor: '1e3a8a', // Dark blue
        textColor: 'FFFFFF',
        accentColor: '3b82f6'
      },
      hockey: {
        emoji: '🏒',
        bgColor: '581c87', // Dark purple
        textColor: 'FFFFFF', 
        accentColor: '8b5cf6'
      },
      esports: {
        emoji: '🎮',
        bgColor: 'dc2626', // Dark red
        textColor: 'FFFFFF',
        accentColor: 'ef4444'
      }
    };
    
    const config = sportConfigs[sport] || sportConfigs.esports;
    const initials = this.getTeamInitials(teamName);
    
    // Create a more sophisticated placeholder using a shield-like design
    const logoUrl = `https://via.placeholder.com/256x256/${config.bgColor}/${config.textColor}?text=${encodeURIComponent(initials)}`;
    
    console.log(`🎨 Generated modern logo for ${teamName}: ${logoUrl}`);
    return logoUrl;
  }

  // Generate shield-style logo 
  generateShieldLogo(teamName, sport) {
    const initials = this.getTeamInitials(teamName);
    const sportColors = {
      football: '28a745',
      baseball: '3b82f6', 
      hockey: '8b5cf6',
      esports: 'ef4444'
    };
    
    const color = sportColors[sport] || 'ef4444';
    return `https://via.placeholder.com/200x240/${color}/FFFFFF?text=${encodeURIComponent(initials)}`;
  }

  // Generate minimal circular logo
  generateMinimalLogo(teamName, sport) {
    const initials = this.getTeamInitials(teamName);
    const sportGradients = {
      football: '22c55e',
      baseball: '3b82f6',
      hockey: 'a855f7', 
      esports: 'f97316'
    };
    
    const color = sportGradients[sport] || 'f97316';
    return `https://via.placeholder.com/200x200/${color}/FFFFFF?text=${encodeURIComponent(initials)}`;
  }

  // Advanced team logo generation with external service fallback
  async generateAdvancedLogo(teamName, sport) {
    try {
      // Try to use UI Avatars API for better looking logos
      const initials = this.getTeamInitials(teamName);
      const sportColors = {
        football: '28a745',
        baseball: '3b82f6', 
        hockey: '8b5cf6',
        esports: 'ef4444'
      };
      
      const bgColor = sportColors[sport] || 'ef4444';
      const logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=${bgColor}&color=fff&format=png&rounded=true&bold=true`;
      
      // Test if the service is available
      const testResponse = await axios.head(logoUrl, { timeout: 3000 });
      
      if (testResponse.status === 200) {
        console.log(`🎨 Generated advanced logo for ${teamName}: ${logoUrl}`);
        return logoUrl;
      }
    } catch (error) {
      console.log(`⚠️ Advanced logo generation failed for ${teamName}, using fallback`);
    }
    
    return this.generateModernLogo(teamName, sport);
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
      const matches = await db.collection('matches').find({}).toArray();
      const uniqueTeams = new Set();
      
      // Extract teams from matches
      for (const match of matches) {
        if (match.team1 && match.sport) {
          uniqueTeams.add(`${match.team1}|${match.sport}`);
        }
        if (match.team2 && match.sport) {
          uniqueTeams.add(`${match.team2}|${match.sport}`);
        }
      }
      
      console.log(`🔄 Updating logos for ${uniqueTeams.size} unique teams...`);
      
      for (const teamKey of uniqueTeams) {
        const [teamName, sport] = teamKey.split('|');
        if (teamName && sport) {
          await this.getTeamLogo(teamName, sport);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`✅ Completed logo update for all teams`);
    } catch (error) {
      console.error(`❌ Error updating all team logos:`, error);
    }
  }

  // Auto-update logos for new teams (called when new matches are parsed)
  async updateLogosForNewTeams(newMatches) {
    try {
      const db = getDatabase();
      const newTeams = new Set();
      
      // Extract unique teams from new matches
      for (const match of newMatches) {
        if (match.team1 && match.sport) {
          newTeams.add(`${match.team1}|${match.sport}`);
        }
        if (match.team2 && match.sport) {
          newTeams.add(`${match.team2}|${match.sport}`);
        }
      }
      
      console.log(`🔍 Checking logos for ${newTeams.size} teams from new matches...`);
      
      for (const teamKey of newTeams) {
        const [teamName, sport] = teamKey.split('|');
        
        // Check if we already have a logo for this team
        const existingLogo = await db.collection('team_logos').findOne({
          team_name: teamName,
          sport: sport
        });
        
        if (!existingLogo) {
          console.log(`🆕 New team detected: ${teamName} (${sport}), fetching logo...`);
          await this.getTeamLogo(teamName, sport);
          // Small delay to avoid overwhelming services
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`✅ Logo check completed for new teams`);
    } catch (error) {
      console.error(`❌ Error updating logos for new teams:`, error);
    }
  }

  // Clean up old logos (remove logos for teams that no longer have matches)
  async cleanupOldLogos() {
    try {
      const db = getDatabase();
      
      // Get all teams currently in matches
      const currentTeams = await db.collection('matches').aggregate([
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
                  in: { 
                    team_name: '$$team.name', 
                    sport: '$$team.sport' 
                  }
                }
              }
            }
          }
        }
      ]).toArray();
      
      if (currentTeams.length > 0) {
        const flatCurrentTeams = currentTeams[0].teams.flat();
        
        // Get all logos in database
        const allLogos = await db.collection('team_logos').find({}).toArray();
        
        // Find logos that don't match any current teams
        const logosToDelete = allLogos.filter(logo => 
          !flatCurrentTeams.some(team => 
            team.team_name === logo.team_name && team.sport === logo.sport
          )
        );
        
        if (logosToDelete.length > 0) {
          console.log(`🧹 Cleaning up ${logosToDelete.length} old team logos...`);
          
          for (const logo of logosToDelete) {
            await db.collection('team_logos').deleteOne({
              _id: logo._id
            });
          }
          
          console.log(`✅ Cleaned up old logos`);
        } else {
          console.log(`✅ No old logos to clean up`);
        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning up old logos:`, error);
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