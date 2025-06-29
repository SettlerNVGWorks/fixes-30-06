// Comprehensive team logos database
const teamLogos = {
  // Football/Soccer Teams
  'Real Madrid': 'https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png',
  'Barcelona': 'https://logoeps.com/wp-content/uploads/2013/03/fc-barcelona-vector-logo.png',
  'Manchester City': 'https://logoeps.com/wp-content/uploads/2013/03/manchester-city-vector-logo.png',
  'Manchester United': 'https://logoeps.com/wp-content/uploads/2013/03/manchester-united-vector-logo.png',
  'Liverpool': 'https://logoeps.com/wp-content/uploads/2013/03/liverpool-vector-logo.png',
  'Arsenal': 'https://logoeps.com/wp-content/uploads/2013/03/arsenal-vector-logo.png',
  'Chelsea': 'https://logoeps.com/wp-content/uploads/2013/03/chelsea-vector-logo.png',
  'Tottenham': 'https://logoeps.com/wp-content/uploads/2013/03/tottenham-vector-logo.png',
  'Bayern Munich': 'https://logoeps.com/wp-content/uploads/2013/03/bayern-munich-vector-logo.png',
  'Borussia Dortmund': 'https://logoeps.com/wp-content/uploads/2013/03/borussia-dortmund-vector-logo.png',
  'Atlético Madrid': 'https://logoeps.com/wp-content/uploads/2013/03/atletico-madrid-vector-logo.png',
  'Sevilla': 'https://logoeps.com/wp-content/uploads/2013/03/sevilla-vector-logo.png',
  'Inter Milan': 'https://logoeps.com/wp-content/uploads/2013/03/inter-milan-vector-logo.png',
  'AC Milan': 'https://logoeps.com/wp-content/uploads/2013/03/ac-milan-vector-logo.png',
  'Juventus': 'https://logoeps.com/wp-content/uploads/2013/03/juventus-vector-logo.png',
  'Napoli': 'https://logoeps.com/wp-content/uploads/2013/03/napoli-vector-logo.png',

  // MLB Teams
  'New York Yankees': 'https://logosvector.net/wp-content/uploads/2022/04/new-york-yankees-logo-vector.png',
  'Boston Red Sox': 'https://logosvector.net/wp-content/uploads/2022/04/boston-red-sox-logo-vector.png',
  'Los Angeles Dodgers': 'https://logosvector.net/wp-content/uploads/2022/04/los-angeles-dodgers-logo-vector.png',
  'San Francisco Giants': 'https://logosvector.net/wp-content/uploads/2022/04/san-francisco-giants-logo-vector.png',
  'Houston Astros': 'https://logosvector.net/wp-content/uploads/2022/04/houston-astros-logo-vector.png',
  'Philadelphia Phillies': 'https://logosvector.net/wp-content/uploads/2022/04/philadelphia-phillies-logo-vector.png',
  'Atlanta Braves': 'https://logosvector.net/wp-content/uploads/2022/04/atlanta-braves-logo-vector.png',
  'New York Mets': 'https://logosvector.net/wp-content/uploads/2022/04/new-york-mets-logo-vector.png',
  'Chicago Cubs': 'https://logosvector.net/wp-content/uploads/2022/04/chicago-cubs-logo-vector.png',
  'St. Louis Cardinals': 'https://logosvector.net/wp-content/uploads/2022/04/st-louis-cardinals-logo-vector.png',
  'Cleveland Guardians': 'https://logosvector.net/wp-content/uploads/2022/04/cleveland-guardians-logo-vector.png',
  'Pittsburgh Pirates': 'https://logosvector.net/wp-content/uploads/2022/04/pittsburgh-pirates-logo-vector.png',
  'Toronto Blue Jays': 'https://logosvector.net/wp-content/uploads/2022/04/toronto-blue-jays-logo-vector.png',
  'Tampa Bay Rays': 'https://logosvector.net/wp-content/uploads/2022/04/tampa-bay-rays-logo-vector.png',
  'Baltimore Orioles': 'https://logosvector.net/wp-content/uploads/2022/04/baltimore-orioles-logo-vector.png',
  'Detroit Tigers': 'https://logosvector.net/wp-content/uploads/2022/04/detroit-tigers-logo-vector.png',
  'Chicago White Sox': 'https://logosvector.net/wp-content/uploads/2022/04/chicago-white-sox-logo-vector.png',
  'Minnesota Twins': 'https://logosvector.net/wp-content/uploads/2022/04/minnesota-twins-logo-vector.png',
  'Texas Rangers': 'https://logosvector.net/wp-content/uploads/2022/04/texas-rangers-logo-vector.png',
  'Seattle Mariners': 'https://logosvector.net/wp-content/uploads/2022/04/seattle-mariners-logo-vector.png',
  'Los Angeles Angels': 'https://logosvector.net/wp-content/uploads/2022/04/los-angeles-angels-logo-vector.png',
  'Miami Marlins': 'https://logosvector.net/wp-content/uploads/2022/04/miami-marlins-logo-vector.png',
  'Milwaukee Brewers': 'https://logosvector.net/wp-content/uploads/2022/04/milwaukee-brewers-logo-vector.png',
  'Cincinnati Reds': 'https://logosvector.net/wp-content/uploads/2022/04/cincinnati-reds-logo-vector.png',
  'San Diego Padres': 'https://logosvector.net/wp-content/uploads/2022/04/san-diego-padres-logo-vector.png',
  'Colorado Rockies': 'https://logosvector.net/wp-content/uploads/2022/04/colorado-rockies-logo-vector.png',

  // NHL Teams
  'Toronto Maple Leafs': 'https://logosvector.net/wp-content/uploads/2022/05/toronto-maple-leafs-logo-vector.png',
  'Montreal Canadiens': 'https://logosvector.net/wp-content/uploads/2022/05/montreal-canadiens-logo-vector.png',
  'Boston Bruins': 'https://logosvector.net/wp-content/uploads/2022/05/boston-bruins-logo-vector.png',
  'New York Rangers': 'https://logosvector.net/wp-content/uploads/2022/05/new-york-rangers-logo-vector.png',
  'Tampa Bay Lightning': 'https://logosvector.net/wp-content/uploads/2022/05/tampa-bay-lightning-logo-vector.png',
  'Florida Panthers': 'https://logosvector.net/wp-content/uploads/2022/05/florida-panthers-logo-vector.png',
  'Pittsburgh Penguins': 'https://logosvector.net/wp-content/uploads/2022/05/pittsburgh-penguins-logo-vector.png',
  'Philadelphia Flyers': 'https://logosvector.net/wp-content/uploads/2022/05/philadelphia-flyers-logo-vector.png',

  // KHL Teams
  'ЦСКА Москва': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/CSKA_Moscow_logo.svg/200px-CSKA_Moscow_logo.svg.png',
  'СКА Санкт-Петербург': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/SKA_Saint_Petersburg_logo.svg/200px-SKA_Saint_Petersburg_logo.svg.png',
  'Динамо Москва': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/HC_Dynamo_Moscow_logo.svg/200px-HC_Dynamo_Moscow_logo.svg.png',
  'Спартак Москва': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/HC_Spartak_Moscow_logo.svg/200px-HC_Spartak_Moscow_logo.svg.png',
  'Авангард Омск': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Avangard_Omsk_logo.svg/200px-Avangard_Omsk_logo.svg.png',
  'Металлург Магнитогорск': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Metallurg_Magnitogorsk_logo.svg/200px-Metallurg_Magnitogorsk_logo.svg.png',

  // Esports Teams
  'Natus Vincere': 'https://logoeps.com/wp-content/uploads/2022/12/natus-vincere-navi-vector-logo.png',
  'Astralis': 'https://logoeps.com/wp-content/uploads/2022/12/astralis-vector-logo.png',
  'G2 Esports': 'https://logoeps.com/wp-content/uploads/2022/12/g2-esports-vector-logo.png',
  'FaZe Clan': 'https://logoeps.com/wp-content/uploads/2022/12/faze-clan-vector-logo.png',
  'Team Liquid': 'https://logoeps.com/wp-content/uploads/2022/12/team-liquid-vector-logo.png',
  'Cloud9': 'https://logoeps.com/wp-content/uploads/2022/12/cloud9-vector-logo.png',
  'Fnatic': 'https://logoeps.com/wp-content/uploads/2022/12/fnatic-vector-logo.png',
  'Vitality': 'https://logoeps.com/wp-content/uploads/2022/12/team-vitality-vector-logo.png',
  'T1': 'https://logoeps.com/wp-content/uploads/2022/12/t1-vector-logo.png',
  'Gen.G': 'https://logoeps.com/wp-content/uploads/2022/12/geng-vector-logo.png',
  'Team Spirit': 'https://logoeps.com/wp-content/uploads/2022/12/team-spirit-vector-logo.png',
  'OG': 'https://logoeps.com/wp-content/uploads/2022/12/og-esports-vector-logo.png',
  'PSG.LGD': 'https://logoeps.com/wp-content/uploads/2022/12/psg-lgd-vector-logo.png',
  'Team Secret': 'https://logoeps.com/wp-content/uploads/2022/12/team-secret-vector-logo.png',
  'Sentinels': 'https://logoeps.com/wp-content/uploads/2022/12/sentinels-vector-logo.png',
  'OpTic Gaming': 'https://logoeps.com/wp-content/uploads/2022/12/optic-gaming-vector-logo.png',
  'LOUD': 'https://logoeps.com/wp-content/uploads/2022/12/loud-vector-logo.png',
  'Gentle Mates': 'https://logoeps.com/wp-content/uploads/2022/12/gentle-mates-vector-logo.png',
  'Zoun': 'https://via.placeholder.com/100x100/FF6B6B/FFFFFF?text=ZN',
  'Ryung': 'https://via.placeholder.com/100x100/4ECDC4/FFFFFF?text=RY'
};

// Default sport logos for fallback
const defaultSportLogos = {
  'football': 'https://via.placeholder.com/100x100/28A745/FFFFFF?text=⚽',
  'baseball': 'https://via.placeholder.com/100x100/007BFF/FFFFFF?text=⚾', 
  'hockey': 'https://via.placeholder.com/100x100/6F42C1/FFFFFF?text=🏒',
  'esports': 'https://via.placeholder.com/100x100/DC3545/FFFFFF?text=🎮'
};

// Function to get team logo
const getTeamLogo = (teamName, sport = 'football') => {
  // Direct match
  if (teamLogos[teamName]) {
    return teamLogos[teamName];
  }
  
  // Try partial match (for cases like "FC Barcelona" vs "Barcelona")
  const partialMatch = Object.keys(teamLogos).find(team => 
    team.toLowerCase().includes(teamName.toLowerCase()) || 
    teamName.toLowerCase().includes(team.toLowerCase())
  );
  
  if (partialMatch) {
    return teamLogos[partialMatch];
  }
  
  // Return default sport logo
  return defaultSportLogos[sport] || defaultSportLogos['football'];
};

module.exports = {
  teamLogos,
  defaultSportLogos,
  getTeamLogo
};