// steam.js — Sistema de login e perfis de usuário do VessieOS
// Fornece autenticação estilo Steam com perfis locais e "Vessie" integrada
// Dependências: window.S (core/main.js), localStorage, toast()

(function () {
  "use strict";

  const STEAM_KEY = 'vessieos_steam_profiles';
  const CURRENT_PROFILE_KEY = 'vessieos_current_steam_profile';

  // Perfis padrão - "Vessie" é o perfil integrado
  const DEFAULT_PROFILES = {
    vessie: {
      id: 'vessie',
      name: 'Vessie',
      avatar: '🤖',
      description: 'Perfil integrado do VessieOS',
      isDefault: true,
      // Dados simulados de Steam
      playtimeForever: 0,
      games: [],
      status: 'offline'
    }
  };

  // Carrega perfis salvos
  function loadProfiles() {
    try {
      const data = localStorage.getItem(STEAM_KEY);
      if (data) {
        const profiles = JSON.parse(data);
        // Garante que o perfil "Vessie" existe
        if (!profiles.vessie) {
          profiles.vessie = { ...DEFAULT_PROFILES.vessie };
        }
        return profiles;
      }
    } catch (e) { }
    // Retorna perfis padrão
    return { ...DEFAULT_PROFILES };
  }

  // Salva perfis
  function saveProfiles(profiles) {
    try {
      localStorage.setItem(STEAM_KEY, JSON.stringify(profiles));
      return true;
    } catch (e) { }
    return false;
  }

  // Obtém perfil atual
  function getCurrentProfile() {
    try {
      const data = localStorage.getItem(CURRENT_PROFILE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) { }
    return null;
  }

  // Define perfil atual
  function setCurrentProfile(profileId) {
    try {
      const profiles = loadProfiles();
      if (profiles[profileId]) {
        localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profileId));
        return true;
      }
    } catch (e) { }
    return false;
  }

  // Obtém usuário atual do sistema
  function getCurrentUser() {
    const profile = getCurrentProfile();
    if (profile && profile.name) return profile.name;
    return S.user || 'Visitante';
  }

  // Lista todos os perfis
  function listProfiles() {
    return Object.keys(loadProfiles());
  }

  // Atualiza dados do perfil
  function updateProfile(profileId, data) {
    const profiles = loadProfiles();
    if (profiles[profileId]) {
      profiles[profileId] = { ...profiles[profileId], ...data };
      return saveProfiles(profiles);
    }
    return false;
  }

  // Login do perfil "Vessie" integrado
  function loginVessieProfile() {
    return setCurrentProfile('vessie');
  }

  // Verifica se há sessão ativa
  function isLoggedIn() {
    return getCurrentProfile() !== null;
  }

  // Obtém informações completas do usuário atual
  function getUserInfo() {
    const profile = getCurrentProfile();
    const username = getCurrentUser();
    return {
      id: profile ? profile.id : 'anonymous',
      name: username,
      avatar: profile ? profile.avatar : '👤',
      isDefault: profile ? profile.isDefault : false,
      isVessie: profile ? profile.id === 'vessie' : false,
      playtime: profile ? profile.playtimeForever : 0,
      status: profile ? profile.status : 'offline'
    };
  }

  // Adiciona jogo ao perfil atual
  function addGameToProfile(gameId, gameData) {
    const profiles = loadProfiles();
    const currentId = getCurrentProfile()?.id;
    if (currentId && profiles[currentId]) {
      if (!profiles[currentId].games) profiles[currentId].games = [];
      if (!profiles[currentId].games.includes(gameId)) {
        profiles[currentId].games.push(gameId);
        return saveProfiles(profiles);
      }
    }
    return false;
  }

  // Remove jogo do perfil
  function removeGameFromProfile(gameId) {
    const profiles = loadProfiles();
    const currentId = getCurrentProfile()?.id;
    if (currentId && profiles[currentId] && profiles[currentId].games) {
      profiles[currentId].games = profiles[currentId].games.filter(g => g !== gameId);
      return saveProfiles(profiles);
    }
    return false;
  }

  // Exporta para window
  window.VessieSteam = {
    loginVessieProfile,
    isLoggedIn,
    getCurrentUser: getCurrentUser,
    getCurrentProfile: getCurrentProfile,
    listProfiles,
    getUserInfo,
    addGameToProfile,
    removeGameFromProfile,
    loadProfiles,
    saveProfiles,
    reloadProfiles: loadProfiles
  };

  // Tenta fazer login do perfil "Vessie" automaticamente ao carregar
  try {
    const profiles = loadProfiles();
    if (!profiles.vessie) {
      saveProfiles({ ...profiles, vessie: { ...DEFAULT_PROFILES.vessie } });
    }
    // Tenta fazer login automático do perfil Vessie
    if (isLoggedIn()) {
      const current = getCurrentProfile().id;
      if (current === 'vessie') {
        // Atualiza S.user se for diferente
        if (S.user !== 'Vessie') {
          S.user = 'Vessie';
        }
      }
    }
  } catch (e) { }

})();