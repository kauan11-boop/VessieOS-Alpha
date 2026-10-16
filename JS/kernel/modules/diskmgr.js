// diskmgr.js — Gerenciador de Discos do VessieOS
// Implementa conceitos de unidades de disco, partições e sistemas de arquivos
// Conceitos Windows 10: FAT, FAT32, ExFAT, NTFS, trilhas, setores, clusters
// Dependências: window.VFS, window.S, window.toast, localStorage

(function () {
  "use strict";

  // --- Sistemas de Arquivos Suportados ---
  const FILE_SYSTEMS = {
    FAT: {
      name: 'FAT',
      fullName: 'File Allocation Table',
      maxPartition: '2 GB',
      maxCluster: '65536 clusters',
      bits: 16,
      usedBy: 'DOS, Windows 95',
      obsolete: true,
      clusterSizes: ['4 KB', '8 KB', '16 KB', '32 KB']
    },
    FAT32: {
      name: 'FAT32',
      fullName: 'File Allocation Table 32',
      maxPartition: '2 TB',
      maxCluster: '268435444 clusters',
      bits: 32,
      usedBy: 'Windows 98, Windows XP, pendrives',
      obsolete: false,
      clusterSizes: ['512 B', '1 KB', '2 KB', '4 KB', '8 KB', '16 KB', '32 KB', '64 KB']
    },
    ExFAT: {
      name: 'ExFAT',
      fullName: 'Extended File Allocation Table',
      maxPartition: '128 PB',
      maxCluster: '2^32 clusters',
      bits: 64,
      usedBy: 'Windows Vista SP1+, SDXC, pendrives grandes',
      obsolete: false,
      clusterSizes: ['512 B', '1 KB', '2 KB', '4 KB', '8 KB', '16 KB', '32 KB', '64 KB', '128 KB', '256 KB', '512 KB', '1 MB', '2 MB', '4 MB', '8 MB', '16 MB', '32 MB']
    },
    NTFS: {
      name: 'NTFS',
      fullName: 'New Technology File System',
      maxPartition: '256 TB',
      maxCluster: '2^32 clusters',
      bits: 64,
      usedBy: 'Windows NT, 2000, XP, Vista, 7, 8, 10, 11',
      obsolete: false,
      clusterSizes: ['512 B', '1 KB', '2 KB', '4 KB', '8 KB', '16 KB', '32 KB', '64 KB']
    },
    CDFS: {
      name: 'CDFS',
      fullName: 'Compact Disc File System',
      maxPartition: '700 MB',
      maxCluster: '2048 bytes',
      bits: 16,
      usedBy: 'CDs',
      obsolete: false,
      clusterSizes: ['2048 B']
    },
    ISO9660: {
      name: 'ISO9660',
      fullName: 'ISO 9660',
      maxPartition: '8 TB',
      maxCluster: '2048 bytes',
      bits: 32,
      usedBy: 'CDs, DVDs (padrão)',
      obsolete: false,
      clusterSizes: ['2048 B']
    },
    Joliet: {
      name: 'Joliet',
      fullName: 'Joliet (Microsoft)',
      maxPartition: '8 TB',
      maxCluster: '2048 bytes',
      bits: 32,
      usedBy: 'CDs (extensão Microsoft do ISO9660)',
      obsolete: false,
      clusterSizes: ['2048 B']
    }
  };

  // --- Tipos de Unidades ---
  const DRIVE_TYPES = {
    FIXED: {
      name: 'Fixa',
      icon: '💿',
      examples: 'HD, Winchester, Disco Rígido, Disco Duro, SSD',
      removable: false
    },
    REMOVABLE: {
      name: 'Removível',
      icon: '📀',
      examples: 'Pen-Drive, HD Externo, Cartão de Memória, CD, DVD, Disquete',
      removable: true
    },
    NETWORK: {
      name: 'Rede',
      icon: '🌐',
      examples: 'Unidade de rede (acesso de outro computador)',
      removable: false
    }
  };

  // --- Estrutura de Disco ---
  // Simula um disco com trilhas, setores e clusters

  // Criar disco
  function createDrive(letter, type, name, capacity, fileSystem) {
    const drive = {
      letter: letter,
      type: type, // 'fixed', 'removable', 'network'
      name: name || `Unidade ${letter}:`,
      capacity: capacity || 1000, // GB
      fileSystem: fileSystem || 'NTFS',
      partitions: [],
      formatted: false,
      totalSectors: 0,
      usedSectors: 0,
      totalClusters: 0,
      usedClusters: 0,
      sectorSize: 512, // bytes
      clusterSize: 4096 // bytes (4 KB padrão NTFS)
    };

    // Calcular trilhas e setores (simulação)
    const totalBytes = drive.capacity * 1024 * 1024 * 1024;
    drive.totalSectors = Math.floor(totalBytes / drive.sectorSize);
    drive.totalClusters = Math.floor(totalBytes / drive.clusterSize);
    // Trilhas simuladas (círculos concêntricos)
    drive.tracks = Math.floor(Math.sqrt(drive.totalSectors / 100));

    return drive;
  }

  // Lista de unidades do sistema
  let drives = [];

  // Inicializar unidades padrão
  function initDrives() {
    drives = [
      createDrive('C', 'fixed', 'Disco Local (C:)', 1000, 'NTFS'),
      createDrive('D', 'fixed', 'Disco Local (D:)', 500, 'NTFS'),
      createDrive('E', 'removable', 'Pen Drive (E:)', 32, 'ExFAT'),
      createDrive('F', 'removable', 'CD/DVD (F:)', 0.7, 'ISO9660')
    ];

    // Adicionar partições no C:
    if (drives[0]) {
      drives[0].partitions = [
        { name: 'Sistema', size: 100, fileSystem: 'NTFS', active: true },
        { name: 'Dados', size: 900, fileSystem: 'NTFS', active: true }
      ];
      drives[0].formatted = true;
    }

    return drives;
  }

  // Formatar unidade
  function formatDrive(letter, fileSystem) {
    const drive = drives.find(d => d.letter === letter);
    if (!drive) {
      if (typeof toast === 'function') toast(`❌ Unidade ${letter}: não encontrada`, 'error');
      return false;
    }

    // Verificar sistema de arquivos válido
    if (!FILE_SYSTEMS[fileSystem]) {
      if (typeof toast === 'function') toast(`❌ Sistema de arquivos ${fileSystem} não suportado`, 'error');
      return false;
    }

    // Simular formatação
    drive.fileSystem = fileSystem;
    drive.formatted = true;
    drive.usedSectors = 0;
    drive.usedClusters = 0;

    // Recalcular baseado no sistema de arquivos
    const fs = FILE_SYSTEMS[fileSystem];
    if (fs.clusterSizes && fs.clusterSizes.length > 0) {
      // Usar o cluster padrão (4 KB se disponível, senão primeiro)
      const defaultCluster = fs.clusterSizes.find(c => c === '4 KB') || fs.clusterSizes[0];
      drive.clusterSize = parseClusterSize(defaultCluster);
    }

    if (typeof toast === 'function') {
      toast(`💿 Unidade ${letter}: formatada com ${fileSystem}`, 'success');
    }

    return true;
  }

  // Converter string de tamanho de cluster para bytes
  function parseClusterSize(sizeStr) {
    const match = sizeStr.match(/(\d+)\s*(B|KB|MB)/);
    if (!match) return 4096;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'B') return value;
    if (unit === 'KB') return value * 1024;
    if (unit === 'MB') return value * 1024 * 1024;
    return 4096;
  }

  // Criar partição
  function createPartition(letter, name, size, fileSystem) {
    const drive = drives.find(d => d.letter === letter);
    if (!drive) return null;

    const partition = {
      name: name || 'Nova Partição',
      size: size || 100,
      fileSystem: fileSystem || 'NTFS',
      active: false,
      tracks: Math.floor(Math.sqrt(size * 1024 * 1024)),
      sectors: Math.floor((size * 1024 * 1024 * 1024) / 512),
      clusters: Math.floor((size * 1024 * 1024 * 1024) / drive.clusterSize)
    };

    drive.partitions.push(partition);

    if (typeof toast === 'function') {
      toast(`✅ Partição "${name}" criada em ${letter}:`, 'success');
    }

    return partition;
  }

  // Obter informações do disco
  function getDriveInfo(letter) {
    const drive = drives.find(d => d.letter === letter);
    if (!drive) return null;

    const fs = FILE_SYSTEMS[drive.fileSystem];

    return {
      ...drive,
      fileSystemInfo: fs,
      driveType: DRIVE_TYPES[drive.type],
      totalBytes: drive.capacity * 1024 * 1024 * 1024,
      freeBytes: (drive.capacity - (drive.usedClusters * drive.clusterSize / (1024 * 1024 * 1024))) * 1024 * 1024 * 1024,
      usagePercent: drive.totalClusters > 0 ? (drive.usedClusters / drive.totalClusters) * 100 : 0
    };
  }

  // Listar todas as unidades
  function listDrives() {
    return drives.map(d => ({
      letter: d.letter,
      name: d.name,
      type: d.type,
      capacity: d.capacity,
      fileSystem: d.fileSystem,
      formatted: d.formatted
    }));
  }

  // Gerar visualização do Gerenciador de Discos
  function generateDiskManagerView() {
    let html = '<div style="padding: 24px;">';

    // Header
    html += `
      <div style="background: linear-gradient(135deg, #a78bfa 0%, #e9e4f5 100%); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1e293b;">💿 Gerenciador de Discos</h2>
        <p style="color: #64748b; margin-top: 8px;">Unidades, partições e sistemas de arquivos</p>
      </div>
    `;

    // Tabela de unidades
    html += '<h3 style="color: #1e293b; margin-bottom: 12px;">Unidades de Disco</h3>';
    html += '<div style="overflow-x: auto;">';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">';
    html += '<thead><tr style="background: #f1f5f9;">';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Unidade</th>';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Tipo</th>';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Capacidade</th>';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Sist. Arquivos</th>';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Status</th>';
    html += '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Ações</th>';
    html += '</tr></thead><tbody>';

    drives.forEach(drive => {
      const typeInfo = DRIVE_TYPES[drive.type];
      const fsInfo = FILE_SYSTEMS[drive.fileSystem];

      html += '<tr style="border-bottom: 1px solid #e2e8f0;">';
      html += `<td style="padding: 8px;"><strong>${drive.letter}:</strong> ${drive.name}</td>`;
      html += `<td style="padding: 8px;">${typeInfo.icon} ${typeInfo.name}</td>`;
      html += `<td style="padding: 8px;">${drive.capacity} GB</td>`;
      html += `<td style="padding: 8px;">${drive.fileSystem}${fsInfo.obsolete ? ' <span style="color: #ef4444; font-size: 0.7rem;">(obsoleto)</span>' : ''}</td>`;
      html += `<td style="padding: 8px;">${drive.formatted ? '<span style="color: #22c55e;">✓ Formatado</span>' : '<span style="color: #f59e0b;">⚠ Não formatado</span>'}</td>`;
      html += `<td style="padding: 8px;">
        <button onclick="VessieDiskMgr.format('${drive.letter}')" style="background: #1d4ed8; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Formatar</button>
        <button onclick="VessieDiskMgr.showInfo('${drive.letter}')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Detalhes</button>
      </td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';

    // Sistemas de arquivos
    html += '<h3 style="color: #1e293b; margin: 24px 0 12px;">Sistemas de Arquivos Suportados</h3>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">';

    Object.entries(FILE_SYSTEMS).forEach(([key, fs]) => {
      html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 600; color: #1e293b;">${fs.name}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${fs.fullName}</div>
          <div style="font-size: 0.7rem; color: #64748b; margin-top: 8px;">
            <div>Máx: ${fs.maxPartition}</div>
            <div>Bits: ${fs.bits}</div>
            ${fs.obsolete ? '<div style="color: #ef4444;">⚠ Obsoleto</div>' : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';

    html += '</div>';
    return html;
  }

  // Abrir Gerenciador de Discos
  function openDiskManager() {
    const win = createWin('Gerenciador de Discos', '💿', generateDiskManagerView(), 800, 600);
    return win;
  }

  // Formatar unidade (com confirmação)
  function formatWithConfirm(letter) {
    const drive = drives.find(d => d.letter === letter);
    if (!drive) return;

    const fsOptions = Object.keys(FILE_SYSTEMS).map(fs =>
      `${fs}${FILE_SYSTEMS[fs].obsolete ? ' (obsoleto)' : ''}`
    ).join(', ');

    const newFS = prompt(
      `💿 Formatar unidade ${letter}:\n\n` +
      `Atual: ${drive.fileSystem}\n` +
      `Disponíveis: ${fsOptions}\n\n` +
      `Digite o sistema de arquivos:`
    );

    if (newFS && FILE_SYSTEMS[newFS]) {
      formatDrive(letter, newFS);
    } else if (newFS) {
      if (typeof toast === 'function') toast(`❌ Sistema de arquivos "${newFS}" não reconhecido`, 'error');
    }
  }

  // Mostrar detalhes da unidade
  function showDriveDetails(letter) {
    const info = getDriveInfo(letter);
    if (!info) return;

    const fs = info.fileSystemInfo;
    const type = info.driveType;

    const details = `
      <div style="padding: 24px;">
        <h3 style="margin-top: 0;">${type.icon} Unidade ${letter}: — ${info.name}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
          <div>
            <h4>Informações Gerais</h4>
            <p><strong>Tipo:</strong> ${type.name}</p>
            <p><strong>Capacidade:</strong> ${info.capacity} GB</p>
            <p><strong>Sistema de Arquivos:</strong> ${info.fileSystem}</p>
            <p><strong>Status:</strong> ${info.formatted ? 'Formatado' : 'Não formatado'}</p>
          </div>
          <div>
            <h4>Sistema de Arquivos</h4>
            <p><strong>Nome:</strong> ${fs.fullName}</p>
            <p><strong>Máximo:</strong> ${fs.maxPartition}</p>
            <p><strong>Cluster:</strong> ${info.clusterSize} bytes</p>
            <p><strong>Bits:</strong> ${fs.bits}</p>
          </div>
        </div>
        <h4 style="margin-top: 16px;">Estrutura Física (Simulada)</h4>
        <p><strong>Trilhas:</strong> ${info.tracks.toLocaleString()}</p>
        <p><strong>Setores:</strong> ${info.totalSectors.toLocaleString()} (${info.sectorSize} bytes cada)</p>
        <p><strong>Clusters:</strong> ${info.totalClusters.toLocaleString()} (${info.clusterSize} bytes cada)</p>
        ${info.partitions.length > 0 ? `
          <h4 style="margin-top: 16px;">Partições (${info.partitions.length})</h4>
          ${info.partitions.map(p => `
            <div style="background: #f8fafc; padding: 8px; border-radius: 6px; margin-top: 8px;">
              <strong>${p.name}</strong> — ${p.size} GB — ${p.fileSystem}
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;

    createWin(`Unidade ${letter}:`, type.icon, details, 600, 500);
  }

  // Inicializar unidades ao carregar
  try {
    initDrives();
  } catch (e) {
    console.error('Erro ao inicializar unidades:', e);
  }

  // Exportar
  window.VessieDiskMgr = {
    FILE_SYSTEMS,
    DRIVE_TYPES,
    createDrive,
    initDrives,
    formatDrive,
    createPartition,
    getDriveInfo,
    listDrives,
    generateDiskManagerView,
    openDiskManager,
    format: formatWithConfirm,
    showInfo: showDriveDetails,
    parseClusterSize
  };

})();