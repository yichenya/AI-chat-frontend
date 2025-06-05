import CryptoJS from 'crypto-js';

// 讯飞星火配置
const SPARK_CONFIG = {
  appId: 'your_app_id',        // 替换为你的AppID
  apiKey: 'your_api_key',      // 替换为你的APIKey
  apiSecret: 'your_api_secret', // 替换为你的APISecret
  hostUrl: 'wss://spark-api.xf-yun.com/v3.1/chat',
  domain: 'generalv3'
};

// 生成鉴权URL
function getWebSocketUrl() {
  const host = 'spark-api.xf-yun.com';
  const path = '/v3.1/chat';
  const date = new Date().toUTCString();
  
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = CryptoJS.HmacSHA256(signatureOrigin, SPARK_CONFIG.apiSecret);
  const signatureBase64 = CryptoJS.enc.Base64.stringify(signature);
  
  const authorizationOrigin = `api_key="${SPARK_CONFIG.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureBase64}"`;
  const authorization = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));
  
  return `${SPARK_CONFIG.hostUrl}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
}

// 发送消息到星火大模型
export function sendToSpark(message, onMessage, onError) {
  const wsUrl = getWebSocketUrl();
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    const params = {
      header: {
        app_id: SPARK_CONFIG.appId,
        uid: 'user_' + Date.now()
      },
      parameter: {
        chat: {
          domain: SPARK_CONFIG.domain,
          temperature: 0.5,
          max_tokens: 2048
        }
      },
      payload: {
        message: {
          text: [
            {
              role: 'user',
              content: message
            }
          ]
        }
      }
    };
    
    ws.send(JSON.stringify(params));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.header.code === 0) {
      const content = data.payload.choices.text[0].content;
      onMessage(content);
      
      // 如果对话结束，关闭连接
      if (data.header.status === 2) {
        ws.close();
      }
    } else {
      onError(data.header.message);
      ws.close();
    }
  };
  
  ws.onerror = (error) => {
    onError('WebSocket连接错误');
    ws.close();
  };
  
  return ws;
}
