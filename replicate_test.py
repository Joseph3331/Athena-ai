import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Azure/OpenAI config
endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4.1-turbo"
token = os.environ.get("GITHUB_TOKEN")
if not token:
    raise RuntimeError("GITHUB_TOKEN environment variable is not set. Please set it before running the backend.")

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)

# Flask app setup
app = Flask(__name__)
CORS(app)

def generate_response(prompt, temperature=1, top_p=1, system_message="You are a helpful AI assistant that provides accurate and concise answers."):
    try:
        response = client.complete(
            messages=[
                SystemMessage(system_message),
                UserMessage(prompt),
            ],
            temperature=temperature,
            top_p=top_p,
            model=model
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in generate_response: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"

@app.route('/chat', methods=['POST'])
def chat():
    try:
        if request.is_json:
            data = request.get_json()
            prompt = data.get('prompt') or data.get('question')
        else:
            prompt = request.form.get('prompt')
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400
        response = generate_response(prompt)
        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'message': 'Backend is running!',
        'status': 'success',
        'api_connected': True,
        'model': model
    })

if __name__ == '__main__':
    print("Starting the server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
