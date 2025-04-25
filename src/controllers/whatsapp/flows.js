const { processFlow } = require('../../services/flow');
const { decryptRequest, encryptResponse, FlowEndpointException } = require('../../utils/encryption');

/**
 * WhatsApp Flows Controller
 * Handles WhatsApp-specific flow integration
 */
class WhatsAppFlowsController {
  static async handleFlowRequest(req, res) {
    if (!req.body) {
      return res.status(400).send();
    }

    let decryptedRequest = null;
    try {
      decryptedRequest = decryptRequest(req.body, process.env.PRIVATE_KEY, process.env.PASSPHRASE);
    } catch (err) {
      console.error(err);
      if (err instanceof FlowEndpointException) {
        return res.status(err.statusCode).send();
      }
      return res.status(500).send();
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
    const screenResponse = await processFlow(decryptedBody);
    
    res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
  }
}

module.exports = WhatsAppFlowsController;