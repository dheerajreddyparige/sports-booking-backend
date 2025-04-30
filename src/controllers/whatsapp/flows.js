const { processFlow } = require('../../services/flow');
const { decryptRequest, encryptResponse, FlowEndpointException } = require('../../utils/encryption');

/**
 * WhatsApp Flows Controller
 * Handles WhatsApp-specific flow integration
 */
class WhatsAppFlowsController {
  static async handleFlowRequest(req, res) {
    console.log('📥 Received WhatsApp Flow request:', {
      headers: req.headers,
      body: req.body ? 'Encrypted body received' : 'No body received'
    });
    
    if (!req.body) {
      console.error('❌ Request body is missing');
      return res.status(400).send();
    }

    let decryptedRequest = null;
    try {
      console.log('🔐 Attempting to decrypt request...');
      decryptedRequest = decryptRequest(req.body, process.env.PRIVATE_KEY, process.env.PASSPHRASE);
      console.log('✅ Request decrypted successfully');
    } catch (err) {
      console.error('❌ Decryption error:', err);
      if (err instanceof FlowEndpointException) {
        return res.status(err.statusCode).send();
      }
      return res.status(500).send();
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
    console.log('📋 Decrypted request body:', JSON.stringify(decryptedBody, null, 2));
    
    console.log('⚙️ Processing flow...');
    const screenResponse = await processFlow(decryptedBody);
    console.log('📤 Flow response:', JSON.stringify(screenResponse, null, 2));
    
    console.log('🔒 Encrypting response...');
    const encryptedResponse = encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer);
    console.log('✅ Response encrypted successfully');
    
    res.send(encryptedResponse);
  }
}

module.exports = WhatsAppFlowsController;