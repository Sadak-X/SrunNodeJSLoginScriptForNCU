const axios = require('axios');
const crypto = require('crypto');
const readlineSync = require('readline-sync');
const fs = require('fs');
const path = require('path');

// Configuration file paths
const CONFIG_DIR = process.platform === 'win32' ? 'C:\\etc' : './etc';
const CONFIG_FILE = path.join(CONFIG_DIR, 'srun_login.conf');
const LOG_DIR = process.platform === 'win32' ? 'C:\\logs' : './log';
const LOG_FILE = path.join(LOG_DIR, 'srun_login.log');

// Default configuration with validation rules
const DEFAULT_CONFIG = {
    username: '',
    password: '',
    login_host: '222.204.3.154',
    auto_reconnect: true,
    check_interval: 60,
    check_url: 'https://www.bing.com',
    retry_interval: 30,
    max_retry_times: 0,
    debug_mode: false,
    network_type: '',  // 网络类型（仅宿舍区需要）
    location: ''     // 用户位置：'teaching'或'dormitory'
};

// 位置相关配置
const LOCATIONS = {
    teaching: {
        name: '教学区(NCUWLAN)',
        login_host: '222.204.3.221',
        needsNetworkType: false
    },
    dormitory: {
        name: '宿舍区(NCU-5G)',
        login_host: '222.204.3.154',
        needsNetworkType: true
    }
};

// Log levels
const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

// Ensure directory exists with error handling
function ensureDirectoryExists(dir) {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        console.error(`[ERROR] Failed to create directory ${dir}: ${error.message}`);
        process.exit(1);
    }
}

// Initialize directories
try {
    ensureDirectoryExists(CONFIG_DIR);
    ensureDirectoryExists(LOG_DIR);
} catch (error) {
    console.error(`[ERROR] Fatal: Could not initialize required directories: ${error.message}`);
    process.exit(1);
}

// Enhanced logging function
function log(message, level = LOG_LEVELS.INFO, showConsole = true) {
    try {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [${level}] ${message}\n`;

        // Always write to log file
        fs.appendFileSync(LOG_FILE, logMessage);

        // Show in console based on level and showConsole flag
        if (showConsole || level === LOG_LEVELS.ERROR || (config.debug_mode && level === LOG_LEVELS.DEBUG)) {
            const consoleMessage = `[${level}] ${message}`;
            if (level === LOG_LEVELS.ERROR) {
                console.error(consoleMessage);
            } else {
                console.log(consoleMessage);
            }
        }
    } catch (error) {
        console.error(`[ERROR] Failed to write log: ${error.message}`);
    }
}

// Validate configuration values
function validateConfigValue(key, value) {
    switch (key) {
        // case 'username':
        //     return typeof value === 'string' && value.length > 0 && value.includes('@');
        case 'password':
            return typeof value === 'string' && value.length > 0;
        case 'login_host':
            return typeof value === 'string' && /^[0-9.]+$/.test(value);
        case 'check_interval':
        case 'retry_interval':
            return Number.isInteger(value) && value >= 10;
        case 'max_retry_times':
            return Number.isInteger(value) && value >= 0;
        case 'auto_reconnect':
        case 'debug_mode':
            return typeof value === 'boolean';
        default:
            return true;
    }
}

// Load configuration file with enhanced error handling
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
            const loadedConfig = { ...DEFAULT_CONFIG };

            fileContent.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    try {
                        const [key, value] = line.split('=').map(str => str.trim());
                        if (key in DEFAULT_CONFIG) {
                            let parsedValue = value;
                            if (value === 'true') parsedValue = true;
                            else if (value === 'false') parsedValue = false;
                            else if (!isNaN(value)) parsedValue = Number(value);

                            if (validateConfigValue(key, parsedValue)) {
                                loadedConfig[key] = parsedValue;
                            } else {
                                log(`Invalid value for ${key}: ${value}`, LOG_LEVELS.WARN);
                            }
                        }
                    } catch (error) {
                        log(`Failed to parse config line: ${line}`, LOG_LEVELS.WARN);
                    }
                }
            });

            return loadedConfig;
        }
    } catch (error) {
        log(`Failed to read configuration file: ${error.message}`, LOG_LEVELS.ERROR);
    }
    return DEFAULT_CONFIG;
}

// Enhanced user input validation
function getUserConfig() {
    log('Configuration file not found or incomplete, starting interactive setup...', LOG_LEVELS.INFO);

    let username;
    while (true) {
        username = readlineSync.question('Please enter your student ID: ').trim();
        if (/^\d+$/.test(username)) {
            break;
        }
        log('Invalid input: Please enter numbers only', LOG_LEVELS.ERROR);
    }

    // Location selection
    console.log('\nSelect your location:');
    console.log('1. Teaching Area (NCUWLAN 222.204.3.221)');
    console.log('2. Dormitory Area (NCU-5G 222.204.3.154)');

    let location;
    let networkType = '';
    let login_host;
    while (true) {
        const choice = readlineSync.question('Enter number (1-2): ');
        if (choice === '1') {
            location = 'teaching';
            login_host = LOCATIONS.teaching.login_host;
            break;
        } else if (choice === '2') {
            location = 'dormitory';
            login_host = LOCATIONS.dormitory.login_host;

            // Only ask for network type in dormitory area
            console.log('\nSelect your campus network type:');
            const networkTypes = ['cmcc', 'ndcard', 'unicom', 'ncu'];
            networkTypes.forEach((type, index) => {
                console.log(`${index + 1}. ${type}`);
            });

            while (true) {
                const netChoice = readlineSync.question('Enter number (1-4): ');
                if (/^[1-4]$/.test(netChoice)) {
                    networkType = networkTypes[parseInt(netChoice) - 1];
                    break;
                }
                log('Invalid choice: Please enter a number between 1 and 4', LOG_LEVELS.ERROR);
            }
            break;
        }
        log('Invalid choice: Please enter 1 or 2', LOG_LEVELS.ERROR);
    }

    const password = readlineSync.question('Please enter your password: ', { hideEchoBack: true });
    if (!password) {
        log('Password cannot be empty', LOG_LEVELS.ERROR);
        process.exit(1);
    }

    // 修改自动重连选项的输入方式
    let auto_reconnect;
    while (true) {
        const input = readlineSync.question('Enable auto reconnect? (Y/n) [Y]: ').trim().toLowerCase();
        if (input === '' || input === 'y') {
            auto_reconnect = true;
            break;
        } else if (input === 'n') {
            auto_reconnect = false;
            break;
        }
        log('Invalid input: Please enter Y or n', LOG_LEVELS.ERROR);
    }

    const config = {
        ...DEFAULT_CONFIG,
        username: location === 'teaching' ? username : `${username}@${networkType}`,
        password: password,
        login_host: login_host,
        auto_reconnect: auto_reconnect,
        network_type: networkType,
        location: location
    };

    try {
        saveConfig(config);
        log('Configuration saved successfully', LOG_LEVELS.INFO);
    } catch (error) {
        log(`Failed to save configuration: ${error.message}`, LOG_LEVELS.ERROR);
        process.exit(1);
    }

    return config;
}

// Enhanced saveConfig function with backup
function saveConfig(config) {
    try {
        // Create backup of existing config if it exists
        if (fs.existsSync(CONFIG_FILE)) {
            const backupFile = `${CONFIG_FILE}.backup`;
            fs.copyFileSync(CONFIG_FILE, backupFile);
        }

        let configContent = '# Srun Login Configuration File\n';
        configContent += `# Last updated: ${new Date().toISOString()}\n\n`;

        Object.entries(config).forEach(([key, value]) => {
            if (key in DEFAULT_CONFIG) {
                configContent += `# ${getConfigDescription(key)}\n`;
                configContent += `${key}=${value}\n\n`;
            }
        });

        fs.writeFileSync(CONFIG_FILE, configContent, 'utf8');
        log(`Configuration saved to: ${CONFIG_FILE}`, LOG_LEVELS.INFO);
    } catch (error) {
        log(`Failed to save configuration: ${error.message}`, LOG_LEVELS.ERROR);
        throw error;
    }
}

// Get configuration item description
function getConfigDescription(key) {
    const descriptions = {
        username: 'Student ID with network type suffix (e.g., 12345678@cmcc)',
        password: 'Login password',
        login_host: 'Login server IP address',
        auto_reconnect: 'Enable automatic reconnection (true/false)',
        check_interval: 'Network check interval in seconds',
        check_url: 'URL used for network connection test',
        retry_interval: 'Interval between retry attempts in seconds',
        max_retry_times: 'Maximum number of retry attempts (0 for unlimited)',
        debug_mode: 'Enable debug logging (true/false)',
        network_type: 'Campus network type (cmcc/ndcard/unicom/ncu)'
    };
    return descriptions[key] || key;
}

// Validate configuration completeness
function validateConfig(config) {
    return config.username && config.password && config.login_host;
}

// Load or create configuration
let config = loadConfig();
if (!validateConfig(config)) {
    config = getUserConfig();
}

// Check network connection
async function checkInternet() {
    try {
        await axios.get(config.check_url, { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

function md5(password, token) {
    // Encrypt password using token
    return crypto.createHash('md5').update(token + password).digest('hex');
}

function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
}

function xencode(str, key) {
    if (str == "") return "";
    let v = s(str, true);
    const k = s(key, false);
    if (k.length < 4) k.length = 4;
    const n = v.length - 1;
    let z = v[n];
    let y = v[0];
    let c = 0x86014019 | 0x183639A0;
    let q = Math.floor(6 + 52 / (n + 1));
    let d = 0;

    while (0 < q--) {
        d = d + c & (0x8CE0D9BF | 0x731F2640);
        const e = d >>> 2 & 3;

        for (let p = 0; p < n; p++) {
            y = v[p + 1];
            let m = z >>> 5 ^ y << 2;
            m += y >>> 3 ^ z << 4 ^ (d ^ y);
            m += k[p & 3 ^ e] ^ z;
            z = v[p] = v[p] + m & (0xEFB8D130 | 0x10472ECF);
        }

        y = v[0];
        let m = z >>> 5 ^ y << 2;
        m += y >>> 3 ^ z << 4 ^ (d ^ y);
        m += k[n & 3 ^ e] ^ z;
        z = v[n] = v[n] + m & (0xBB390742 | 0x44C6F8BD);
    }

    return l(v, false);
}

function s(a, b) {
    const c = a.length;
    const v = [];
    for (let i = 0; i < c; i += 4) {
        v[i >> 2] = a.charCodeAt(i) | a.charCodeAt(i + 1) << 8 |
            a.charCodeAt(i + 2) << 16 | a.charCodeAt(i + 3) << 24;
    }
    if (b) v[v.length] = c;
    return v;
}

function l(a, b) {
    const d = a.length;
    const c = (d - 1) << 2;
    if (b) {
        const m = a[d - 1];
        if ((m < c - 3) || (m > c)) return null;
        c = m;
    }
    const result = [];
    for (let i = 0; i < d; i++) {
        result[i] = String.fromCharCode(a[i] & 0xff, a[i] >>> 8 & 0xff,
            a[i] >>> 16 & 0xff, a[i] >>> 24 & 0xff);
    }
    return b ? result.join('').substring(0, c) : result.join('');
}

// base64 encoding function
function base64Encode(str) {
    const base64abc = 'LVoJPiCN2R8G90yg+hmFHuacZ1OWMnrsSTXkYpUq/3dlbfKwv6xztjI7DeBE45QA';
    let result = '';
    let i = 0;
    const bin = Buffer.from(str, 'binary').toString('base64');
    const binLen = bin.length;

    for (; i < binLen; i++) {
        if (bin[i] === '=') {
            result += bin[i];
        } else {
            const pos = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(bin[i]);
            result += base64abc[pos];
        }
    }
    return result;
}

function getEncodedUserInfo(info, token) {
    const jsonStr = JSON.stringify(info);
    // Use modified base64 encoding
    const encoded = '{SRBX1}' + base64Encode(xencode(jsonStr, token));
    return encoded;
}

async function getLoginParams() {
    try {
        // Access login page to get parameters
        const response = await axios.get(`http://${config.login_host}`);
        const url = new URL(response.request.res.responseUrl);
        const params = Object.fromEntries(url.searchParams);

        // Get ac_id
        const acid = params.ac_id || (config.location === 'teaching' ? '39' : '5');

        // Get user_ip
        const match = response.data.match(/<input type="hidden" name="user_ip" id="user_ip" value="([^"]+)"/);
        const ip = match ? match[1] : '';

        return {
            acid,
            ip
        };
    } catch (error) {
        console.error('Failed to get login parameters:', error);
        // Return default values
        return {
            acid: '5',
            ip: ''
        };
    }
}

async function getInitInfo(username, ip) {
    const url = `http://${config.login_host}/cgi-bin/get_challenge`;
    const params = {
        username: username,
        ip: ip
    };

    try {
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error('Failed to get initialization information:', error);
        throw error;
    }
}

async function login() {
    try {
        // 1. Get login parameters
        const loginParams = await getLoginParams();
        log('Got login parameters: ' + JSON.stringify(loginParams));

        const username = config.username;

        // 2. Get challenge initialization information
        const initInfo = await getInitInfo(username, loginParams.ip);
        log('Got initialization information: ' + JSON.stringify(initInfo));

        const token = initInfo.challenge;
        const ip = loginParams.ip || initInfo.client_ip;

        // 3. Encrypt password
        const hmd5 = md5(config.password, token);

        // 4. Modify info encryption format
        const info = {
            username: username,
            password: config.password,
            ip: ip,
            acid: loginParams.acid,
            enc_ver: 'srun_bx1'
        };

        const encodedUser = getEncodedUserInfo(info, token);

        // 5. Calculate checksum
        let str = token + username;
        str += token + hmd5;
        str += token + loginParams.acid;
        str += token + ip;
        str += token + '200';
        str += token + '1';
        str += token + encodedUser;

        const checksum = sha1(str);

        // 6. Send login request
        const loginUrl = `http://${config.login_host}/cgi-bin/srun_portal`;
        const params = {
            action: 'login',
            username: username,
            password: '{MD5}' + hmd5,
            ac_id: loginParams.acid,
            ip: ip,
            info: encodedUser,
            chksum: checksum,
            n: 200,
            type: 1,
            os: 'Windows 10',
            name: 'Windows',
            double_stack: 0
        };

        const loginRes = await axios.get(loginUrl, { params });
        log('Login result: ' + JSON.stringify(loginRes.data));
        return loginRes.data.error === 'ok' || loginRes.data.error_msg === 'E2620: You are already online.';

    } catch (error) {
        log('Login failed: ' + error.message, true);
        return false;
    }
}

async function startLoginLoop() {
    let retryCount = 0;
    log('Starting login monitoring...', LOG_LEVELS.INFO);

    while (true) {
        try {
            const isConnected = await checkInternet();

            if (!isConnected && config.auto_reconnect) {
                log('Network disconnected, attempting to reconnect...', LOG_LEVELS.WARN);
                const loginSuccess = await login();

                if (loginSuccess) {
                    log('Reconnection successful', LOG_LEVELS.INFO);
                    retryCount = 0;
                } else {
                    retryCount++;
                    if (config.max_retry_times > 0 && retryCount >= config.max_retry_times) {
                        log('Maximum retry attempts reached, stopping reconnection', LOG_LEVELS.ERROR);
                        break;
                    }
                    log(`Login failed, retrying in ${config.retry_interval} seconds... (Attempt ${retryCount})`, LOG_LEVELS.WARN);
                    await new Promise(resolve => setTimeout(resolve, config.retry_interval * 1000));
                }
            } else {
                if (config.debug_mode) {
                    log('Network connection check passed', LOG_LEVELS.DEBUG);
                }
                await new Promise(resolve => setTimeout(resolve, config.check_interval * 1000));
            }
        } catch (error) {
            log(`Error in login loop: ${error.message}`, LOG_LEVELS.ERROR);
            await new Promise(resolve => setTimeout(resolve, config.retry_interval * 1000));
        }
    }
}

// Main program execution with error handling
async function main() {
    try {
        config = loadConfig();
        if (!validateConfig(config)) {
            config = getUserConfig();
        }

        log('Starting Srun login client...', LOG_LEVELS.INFO);
        log(`Configured for user: ${config.username}`, LOG_LEVELS.INFO);

        if (config.auto_reconnect) {
            log('Auto reconnect enabled', LOG_LEVELS.INFO);
            await startLoginLoop();
        } else {
            log('Running in single login mode', LOG_LEVELS.INFO);
            await login();
        }
    } catch (error) {
        log(`Fatal error: ${error.message}`, LOG_LEVELS.ERROR);
        process.exit(1);
    }
}

// Start the program
main();
