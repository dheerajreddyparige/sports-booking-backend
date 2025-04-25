const { getNextScreen } = require('../utils/flow');

/**
 * Core flow logic service
 * @param {Object} decryptedBody - Decrypted request body
 * @returns {Promise<Object>} - Response for next screen
 */
async function processFlow(decryptedBody) {
  return await getNextScreen(decryptedBody);
}

module.exports = {
  processFlow
};