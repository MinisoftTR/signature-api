const fs = require('fs');
const path = require('path');

class SignatureOrganizer {
  constructor(baseDir = './signature-requests') {
    this.baseDir = baseDir;
    this.ensureBaseStructure();
  }

  ensureBaseStructure() {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, 'logs', 'daily'),
      path.join(this.baseDir, 'logs', 'users'),
      path.join(this.baseDir, 'stats')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  }

  sanitizeName(name) {
    return name.toLowerCase()
      .replace(/[türkçe chars]/g, (char) => {
        const map = {
          'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
          'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  getDateFromTimestamp(timestamp) {
    return timestamp.split('T')[0];
  }

  getUserFolder(name, date) {
    const sanitizedName = this.sanitizeName(name);
    const userDir = path.join(this.baseDir, date, sanitizedName);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      // Create subfolders
      ['signatures', 'logs'].forEach(subDir => {
        const subDirPath = path.join(userDir, subDir);
        if (!fs.existsSync(subDirPath)) {
          fs.mkdirSync(subDirPath, { recursive: true });
        }
      });
    }

    return userDir;
  }

  organizeSignatureRequest(logEntry) {
    const { timestamp, name_requested, font_style, success, error, client_ip } = logEntry;
    const date = this.getDateFromTimestamp(timestamp);
    const userFolder = this.getUserFolder(name_requested, date);

    // Save log entry to user's logs folder
    const userLogFile = path.join(userFolder, 'logs', 'requests.json');
    this.appendToJsonFile(userLogFile, logEntry);

    // Save to daily log
    const dailyLogFile = path.join(this.baseDir, 'logs', 'daily', `${date}.json`);
    this.appendToJsonFile(dailyLogFile, logEntry);

    // Save to user's global log
    const sanitizedName = this.sanitizeName(name_requested);
    const userGlobalLogFile = path.join(this.baseDir, 'logs', 'users', `${sanitizedName}.json`);
    this.appendToJsonFile(userGlobalLogFile, logEntry);

    // Update user summary
    this.updateUserSummary(userFolder, logEntry);

    // Update daily stats
    this.updateDailyStats(date, logEntry);

    // Update user stats
    this.updateUserStats(sanitizedName, logEntry);

    return {
      userFolder,
      date,
      sanitizedName
    };
  }

  organizeSignatureFile(filePath) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^(.+?)_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_(.+)\.(png|svg)$/);

    if (!match) {
      console.warn(`Unable to parse filename: ${fileName}`);
      return null;
    }

    const [, name, date, time, style, ext] = match;
    const userFolder = this.getUserFolder(name, date);
    const signaturesFolder = path.join(userFolder, 'signatures');
    const newPath = path.join(signaturesFolder, fileName);

    try {
      if (fs.existsSync(filePath) && !fs.existsSync(newPath)) {
        fs.copyFileSync(filePath, newPath);
        console.log(`Moved signature: ${fileName} -> ${newPath}`);
        return newPath;
      }
    } catch (error) {
      console.error(`Error moving file ${fileName}:`, error.message);
    }

    return null;
  }

  appendToJsonFile(filePath, data) {
    try {
      let existingData = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.trim()) {
          existingData = JSON.parse(content);
        }
      }

      existingData.push(data);
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error(`Error writing to ${filePath}:`, error.message);
    }
  }

  updateUserSummary(userFolder, logEntry) {
    const summaryFile = path.join(userFolder, 'summary.json');
    let summary = {
      name: logEntry.name_requested,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      uniqueStyles: [],
      firstRequest: logEntry.timestamp,
      lastRequest: logEntry.timestamp,
      clientIPs: []
    };

    if (fs.existsSync(summaryFile)) {
      const existing = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      summary = {
        ...existing,
        uniqueStyles: existing.uniqueStyles || [],
        clientIPs: existing.clientIPs || []
      };
    }

    summary.totalRequests++;
    if (logEntry.success) {
      summary.successfulRequests++;
    } else {
      summary.failedRequests++;
    }

    if (!summary.uniqueStyles.includes(logEntry.font_style)) {
      summary.uniqueStyles.push(logEntry.font_style);
    }
    if (!summary.clientIPs.includes(logEntry.client_ip)) {
      summary.clientIPs.push(logEntry.client_ip);
    }

    summary.lastRequest = logEntry.timestamp;

    if (logEntry.timestamp < summary.firstRequest) {
      summary.firstRequest = logEntry.timestamp;
    }

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  }

  updateDailyStats(date, logEntry) {
    const statsFile = path.join(this.baseDir, 'stats', 'daily-stats.json');
    let stats = {};

    if (fs.existsSync(statsFile)) {
      stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }

    if (!stats[date]) {
      stats[date] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        uniqueUsers: [],
        uniqueStyles: [],
        clientIPs: []
      };
    }

    const dayStats = stats[date];
    dayStats.totalRequests++;

    if (logEntry.success) {
      dayStats.successfulRequests++;
    } else {
      dayStats.failedRequests++;
    }

    const sanitizedName = this.sanitizeName(logEntry.name_requested);
    if (!dayStats.uniqueUsers.includes(sanitizedName)) {
      dayStats.uniqueUsers.push(sanitizedName);
    }
    if (!dayStats.uniqueStyles.includes(logEntry.font_style)) {
      dayStats.uniqueStyles.push(logEntry.font_style);
    }
    if (!dayStats.clientIPs.includes(logEntry.client_ip)) {
      dayStats.clientIPs.push(logEntry.client_ip);
    }

    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  }

  updateUserStats(sanitizedName, logEntry) {
    const statsFile = path.join(this.baseDir, 'stats', 'user-stats.json');
    let stats = {};

    if (fs.existsSync(statsFile)) {
      stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }

    if (!stats[sanitizedName]) {
      stats[sanitizedName] = {
        originalName: logEntry.name_requested,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        uniqueStyles: [],
        activeDays: [],
        clientIPs: [],
        firstSeen: logEntry.timestamp,
        lastSeen: logEntry.timestamp
      };
    }

    const userStats = stats[sanitizedName];
    userStats.totalRequests++;

    if (logEntry.success) {
      userStats.successfulRequests++;
    } else {
      userStats.failedRequests++;
    }

    if (!userStats.uniqueStyles.includes(logEntry.font_style)) {
      userStats.uniqueStyles.push(logEntry.font_style);
    }

    const currentDate = this.getDateFromTimestamp(logEntry.timestamp);
    if (!userStats.activeDays.includes(currentDate)) {
      userStats.activeDays.push(currentDate);
    }

    if (!userStats.clientIPs.includes(logEntry.client_ip)) {
      userStats.clientIPs.push(logEntry.client_ip);
    }

    userStats.lastSeen = logEntry.timestamp;

    if (logEntry.timestamp < userStats.firstSeen) {
      userStats.firstSeen = logEntry.timestamp;
    }

    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  }

  async processExistingLogs(logFilePath) {
    console.log('Processing existing signature request logs...');

    if (!fs.existsSync(logFilePath)) {
      console.error(`Log file not found: ${logFilePath}`);
      return;
    }

    const content = fs.readFileSync(logFilePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    console.log(`Processing ${lines.length} log entries...`);

    for (let i = 0; i < lines.length; i++) {
      try {
        const logEntry = JSON.parse(lines[i]);
        this.organizeSignatureRequest(logEntry);

        if ((i + 1) % 100 === 0) {
          console.log(`Processed ${i + 1}/${lines.length} entries`);
        }
      } catch (error) {
        console.error(`Error processing line ${i + 1}:`, error.message);
      }
    }

    console.log('Finished processing existing logs');
  }

  async processExistingSignatures(signaturesDir) {
    console.log('Processing existing signature files...');

    if (!fs.existsSync(signaturesDir)) {
      console.error(`Signatures directory not found: ${signaturesDir}`);
      return;
    }

    const files = fs.readdirSync(signaturesDir);
    const signatureFiles = files.filter(file =>
      file.endsWith('.png') || file.endsWith('.svg')
    );

    console.log(`Processing ${signatureFiles.length} signature files...`);

    for (let i = 0; i < signatureFiles.length; i++) {
      const filePath = path.join(signaturesDir, signatureFiles[i]);
      this.organizeSignatureFile(filePath);

      if ((i + 1) % 50 === 0) {
        console.log(`Processed ${i + 1}/${signatureFiles.length} files`);
      }
    }

    console.log('Finished processing existing signature files');
  }

  generateReport() {
    const dailyStatsPath = path.join(this.baseDir, 'stats', 'daily-stats.json');
    const userStatsPath = path.join(this.baseDir, 'stats', 'user-stats.json');

    let report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDays: 0,
        totalUsers: 0,
        totalRequests: 0,
        totalSuccessful: 0,
        totalFailed: 0
      },
      topUsers: [],
      topStyles: {},
      dailyActivity: {}
    };

    // Read daily stats
    if (fs.existsSync(dailyStatsPath)) {
      const dailyStats = JSON.parse(fs.readFileSync(dailyStatsPath, 'utf8'));
      report.summary.totalDays = Object.keys(dailyStats).length;
      report.dailyActivity = dailyStats;

      Object.values(dailyStats).forEach(day => {
        report.summary.totalRequests += day.totalRequests;
        report.summary.totalSuccessful += day.successfulRequests;
        report.summary.totalFailed += day.failedRequests;
      });
    }

    // Read user stats
    if (fs.existsSync(userStatsPath)) {
      const userStats = JSON.parse(fs.readFileSync(userStatsPath, 'utf8'));
      report.summary.totalUsers = Object.keys(userStats).length;

      // Top users by request count
      report.topUsers = Object.entries(userStats)
        .map(([key, stats]) => ({
          name: stats.originalName,
          totalRequests: stats.totalRequests,
          successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1),
          uniqueStyles: stats.uniqueStyles.length,
          activeDays: stats.activeDays.length
        }))
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 10);
    }

    const reportPath = path.join(this.baseDir, 'organization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== ORGANIZATION REPORT ===');
    console.log(`Total Days: ${report.summary.totalDays}`);
    console.log(`Total Users: ${report.summary.totalUsers}`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Success Rate: ${((report.summary.totalSuccessful / report.summary.totalRequests) * 100).toFixed(1)}%`);
    console.log(`\nTop Users:`);
    report.topUsers.slice(0, 5).forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} - ${user.totalRequests} requests (${user.successRate}% success)`);
    });

    return report;
  }
}

module.exports = SignatureOrganizer;