import * as echarts from 'echarts';

type LevelData = {
  level: number;
  exp_needed: number;
  maxhp: number;
  attack: number;
  defense: number;
  speed: number;
};

let levelData: LevelData[] = [];

const tableContainer = document.getElementById('table-container') as HTMLDivElement;
const chartContainer = document.getElementById('chart-container') as HTMLDivElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;

const chart = echarts.init(chartContainer);

async function fetchData() {
  try {
    const response = await fetch('/api/leveldata');
    if (!response.ok) {
      throw new Error('Failed to fetch level data');
    }
    levelData = await response.json();
    renderTable();
    renderChart();
  } catch (error) {
    console.error(error);
    alert('Could not load level data. Check the console for more information.');
  }
}

function renderTable() {
  if (!tableContainer) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headers = ['level', 'exp_needed', 'maxhp', 'attack', 'defense', 'speed'];
  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  levelData.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = row[header as keyof LevelData].toString();
      if (header !== 'level') {
        td.contentEditable = 'true';
        td.addEventListener('input', (e) => {
          const value = (e.target as HTMLTableCellElement).textContent || '';
          (levelData[rowIndex] as any)[header] = parseInt(value, 10) || 0;
        });
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);
}

function renderChart() {
  if (!chart) return;

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['exp_needed', 'maxhp', 'attack', 'defense', 'speed']
    },
    xAxis: {
      type: 'category',
      data: levelData.map(d => d.level)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'exp_needed',
        type: 'line',
        data: levelData.map(d => d.exp_needed)
      },
      {
        name: 'maxhp',
        type: 'line',
        data: levelData.map(d => d.maxhp)
      },
      {
        name: 'attack',
        type: 'line',
        data: levelData.map(d => d.attack)
      },
      {
        name: 'defense',
        type: 'line',
        data: levelData.map(d => d.defense)
      },
      {
        name: 'speed',
        type: 'line',
        data: levelData.map(d => d.speed)
      }
    ]
  };

  chart.setOption(option);
}

async function saveData() {
  try {
    const response = await fetch('/api/leveldata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(levelData),
    });
    if (!response.ok) {
      throw new Error('Failed to save level data');
    }
    alert('Level data saved successfully!');
    // Re-render to reflect any potential server-side changes
    fetchData();
  } catch (error) {
    console.error(error);
    alert('Could not save level data. Check the console for more information.');
  }
}

saveButton.addEventListener('click', saveData);

const expandButton = document.getElementById('expand-button') as HTMLButtonElement;
const shrinkButton = document.getElementById('shrink-button') as HTMLButtonElement;

function expandLevels() {
  const newLevelCountStr = prompt('Enter the new total number of levels:', '100');
  if (!newLevelCountStr) return;

  const newLevelCount = parseInt(newLevelCountStr, 10);
  if (isNaN(newLevelCount) || newLevelCount <= levelData.length) {
    alert('Invalid number of levels.');
    return;
  }

  const lastLevels = levelData.slice(-5);
  if (lastLevels.length < 2) {
    alert('Not enough data to calculate growth. Need at least 2 levels.');
    return;
  }

  const growth = {
    exp_needed: 0,
    maxhp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
  };

  for (let i = 1; i < lastLevels.length; i++) {
    growth.exp_needed += lastLevels[i].exp_needed - lastLevels[i-1].exp_needed;
    growth.maxhp += lastLevels[i].maxhp - lastLevels[i-1].maxhp;
    growth.attack += lastLevels[i].attack - lastLevels[i-1].attack;
    growth.defense += lastLevels[i].defense - lastLevels[i-1].defense;
    growth.speed += lastLevels[i].speed - lastLevels[i-1].speed;
  }

  growth.exp_needed = Math.round(growth.exp_needed / (lastLevels.length - 1));
  growth.maxhp = Math.round(growth.maxhp / (lastLevels.length - 1));
  growth.attack = Math.round(growth.attack / (lastLevels.length - 1));
  growth.defense = Math.round(growth.defense / (lastLevels.length - 1));
  growth.speed = Math.round(growth.speed / (lastLevels.length - 1));

  let lastLevel = levelData[levelData.length - 1];
  for (let i = levelData.length + 1; i <= newLevelCount; i++) {
    const newLevel: LevelData = {
      level: i,
      exp_needed: lastLevel.exp_needed + growth.exp_needed,
      maxhp: lastLevel.maxhp + growth.maxhp,
      attack: lastLevel.attack + growth.attack,
      defense: lastLevel.defense + growth.defense,
      speed: lastLevel.speed + growth.speed,
    };
    levelData.push(newLevel);
    lastLevel = newLevel;
  }

  renderTable();
  renderChart();
}

function shrinkLevels() {
    const newLevelCountStr = prompt('Enter the new total number of levels:', '10');
    if (!newLevelCountStr) return;

    const newLevelCount = parseInt(newLevelCountStr, 10);
    if (isNaN(newLevelCount) || newLevelCount >= levelData.length || newLevelCount < 1) {
        alert('Invalid number of levels.');
        return;
    }

    levelData = levelData.slice(0, newLevelCount);
    renderTable();
    renderChart();
}


expandButton.addEventListener('click', expandLevels);
shrinkButton.addEventListener('click', shrinkLevels);


// Initial load
fetchData();
