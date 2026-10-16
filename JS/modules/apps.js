(function () {
  function init() {
    window.VessieOS = window.VessieOS || {};
    window.VessieOS.apps = window.VessieOS.apps || {
      // 'VessieLang' foi adicionado na integração com o motor da linguagem
      // própria do ecossistema (ver JS/kernel/modules/vessielang/). Esta
      // lista só define quais nomes existem — o conteúdo real de cada
      // janela ainda é responsabilidade de JS/modules/windows.js (hoje um
      // stub, ver comentário lá). Quando a janela for implementada, use
      // window.VessieOS.vessielang.run(codigo) / .runFile(caminho) como
      // ponte para o editor/terminal; até lá, systems/vessielang/playground.html
      // já oferece uma UI mínima e funcional para testar a linguagem.
      list: ['VessieOS', 'Terminal', 'Arquivos', 'Game Hub', 'Bloco de notas', 'VessieLang']
    };
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.apps = { init };
})();
