class MockOpenAIAPI {
  async chatCompletions(params) {
    return {
      data: {
        choices: [
          {
            message: {
              content: 'Mocked AI response for prompt: ' + params.messages[0].content
            }
          }
        ]
      }
    };
  }

  async imageGenerations(params) {
    return {
      data: {
        data: [
          {
            url: 'http://mocked.image.url/generated.png'
          }
        ]
      }
    };
  }
}

module.exports = new MockOpenAIAPI();
