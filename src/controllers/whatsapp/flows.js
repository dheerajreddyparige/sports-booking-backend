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
      // Make sure we have all required properties in the request body
      if (!req.body.encrypted_aes_key || !req.body.encrypted_flow_data || !req.body.initial_vector) {
        console.error('❌ Missing required encryption parameters in request body');
        return res.status(400).json({ error: 'Missing required encryption parameters' });
      }
      
      // Get private key and passphrase from environment variables or config
      const config = require('../../config');
      const privateKey = process.env.PRIVATE_KEY || config.flow.privateKey;
      const passphrase = process.env.PASSPHRASE || config.flow.passphrase;
      
      if (!privateKey) {
        console.error('❌ Private key is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      decryptedRequest = decryptRequest(req.body, privateKey, passphrase);
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