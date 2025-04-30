const { getNextScreen } = require('../utils/flow');

/**
 * Core flow logic service
 * @param {Object} decryptedBody - Decrypted request body
 * @returns {Promise<Object>} - Response for next screen
 */
async function processFlow(decryptedBody) {
  console.log('🔄 Processing flow with data:', {
    screen: decryptedBody.screen,
    action: decryptedBody.action,
    flowToken: decryptedBody.flow_token,
    hasData: !!decryptedBody.data
  });
  
  const response = await getNextScreen(decryptedBody);
  
  console.log('✅ Flow processing complete, returning screen:', response.screen || 'No screen specified');
  return response;
}

module.exports = {
  processFlow
};