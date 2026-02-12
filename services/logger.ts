
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private format(level: LogLevel, domain: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    let dataStr = '';
    
    if (data) {
      try {
        if (data instanceof Error) {
          dataStr = ` | Error: ${data.message}`;
        } else if (typeof data === 'object') {
          // Check if it has a message property even if it's not an instance of Error
          if (data.message) {
             dataStr = ` | Error: ${data.message}`;
          } else {
             dataStr = ` | Data: ${JSON.stringify(data)}`;
          }
        } else {
          dataStr = ` | Data: ${data}`;
        }
      } catch (e) {
        dataStr = ' | [Unserializable Data]';
      }
    }
    
    return `[${timestamp}] [${level}] [${domain}] ${message}${dataStr}`;
  }

  info(domain: string, message: string, data?: any) {
    console.info(this.format('INFO', domain, message, data));
  }

  warn(domain: string, message: string, data?: any) {
    console.warn(this.format('WARN', domain, message, data));
  }

  error(domain: string, message: string, data?: any) {
    console.error(this.format('ERROR', domain, message, data));
  }

  debug(domain: string, message: string, data?: any) {
    console.debug(this.format('DEBUG', domain, message, data));
  }
}

export const logger = new Logger();
