(function () {
  const root = {
    name: 'SystemDrive',
    type: 'folder',
    children: {
      Windows: {
        type: 'folder',
        children: {
          System32: { type: 'folder', children: {} },
          Drivers: { type: 'folder', children: {} }
        }
      },
      Programs: {
        type: 'folder',
        children: {}
      }
    }
  };

  function createNode(name, type = 'file', value = null) {
    return { name, type, value, children: type === 'folder' ? {} : null };
  }

  function list(path = 'SystemDrive') {
    const current = resolve(path);
    if (!current) return [];
    return Object.keys(current.children || {});
  }

  function resolve(path) {
    if (!path || path === '/' || path === 'SystemDrive') return root;
    const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
    let cursor = root;
    for (const segment of segments) {
      if (!cursor || !cursor.children || !cursor.children[segment]) return null;
      cursor = cursor.children[segment];
    }
    return cursor;
  }

  function add(path, node) {
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'SystemDrive';
    const name = path.split('/').filter(Boolean).pop();
    const parent = resolve(parentPath);
    if (!parent || !parent.children) return false;
    parent.children[name] = node;
    return true;
  }

  function spawnExecutable(name, payload) {
    const target = `SystemDrive/Programs/${name}`;
    return add(target, createNode(name, 'file', payload));
  }

  window.VessieOS = window.VessieOS || {};
  // Se o VFS real do desktop (JS/core/main.js, que carrega antes deste
  // arquivo na sequência de boot) já se registrou aqui, não sobrescreve —
  // preserva um ÚNICO filesystem compartilhado entre Terminal, Explorador
  // de Arquivos e os comandos fs.* do VessieScript. Detecta pela presença
  // de `.read`, método que só o VFS real do desktop expõe.
  if (!(window.VessieOS.FileSystem && typeof window.VessieOS.FileSystem.read === 'function')) {
    window.VessieOS.FileSystem = {
      root,
      list,
      resolve,
      add,
      spawnExecutable
    };
  }
})();
