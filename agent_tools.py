import json
import subprocess
import os

MEMORY_FILE = "memory.json"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_bash",
            "description": "Execute a bash command on the local system",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The command to execute"
                    }
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file on the local filesystem",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "The absolute or relative path to the file"
                    }
                },
                "required": ["filepath"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create or overwrite a file with new content",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "The path to the file to write"
                    },
                    "content": {
                        "type": "string",
                        "description": "The complete content to write into the file. Must be the entire valid file content."
                    }
                },
                "required": ["filepath", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "memorize_fact",
            "description": "Save an important fact, architectural decision, or rule to long-term memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "A short, unique identifier for the fact (e.g. 'ui_theme_preference')"
                    },
                    "fact": {
                        "type": "string",
                        "description": "The detailed fact to remember"
                    }
                },
                "required": ["key", "fact"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recall_facts",
            "description": "Recall all facts saved in long-term memory to regain context.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_code",
            "description": "Run static code analysis (flake8) on a python file to check for syntax errors or bugs before executing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "The path to the python file to analyze"
                    }
                },
                "required": ["filepath"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delegate_task",
            "description": "Spawn a fresh Sub-Agent to perform deep research, write a huge file, or solve a heavy sub-problem without polluting your main context window.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objective": {
                        "type": "string",
                        "description": "The extremely detailed prompt and objective for the sub-agent."
                    }
                },
                "required": ["objective"]
            }
        }
    }
]

def execute_bash(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        output = result.stdout if result.returncode == 0 else result.stderr
        
        # Self-Healing Verification Loop Check
        if result.returncode != 0:
            return f"[EXECUTION FAILED - EXIT CODE {result.returncode}]\n{output}\n\n[SYSTEM INSTRUCTION: Your code failed. Diagnose the error above, read the file if necessary, and use write_file to deploy a fix instantly.]"
        return output
    except Exception as e:
        return str(e)

def read_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return str(e)

def write_file(filepath, content):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return "File written successfully."
    except Exception as e:
        return str(e)

def memorize_fact(key, fact):
    try:
        data = {}
        if os.path.exists(MEMORY_FILE):
            with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        data[key] = fact
        with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return f"Fact '{key}' successfully saved to long-term memory."
    except Exception as e:
        return str(e)

def recall_facts():
    try:
        if not os.path.exists(MEMORY_FILE):
            return "Memory is entirely empty."
        with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not data:
            return "Memory is currently empty."
        return json.dumps(data, indent=4)
    except Exception as e:
        return str(e)

def analyze_code(filepath):
    try:
        if not filepath.endswith(".py"):
            return "Currently, analyze_code only supports Python (.py) files using flake8."
        result = subprocess.run(f"flake8 {filepath}", shell=True, capture_output=True, text=True)
        if not result.stdout and result.returncode == 0:
            return "Analysis Complete: 0 Errors Found. Code looks perfectly clean."
        return f"Analysis Errors:\n{result.stdout}\n\n[SYSTEM INSTRUCTION: Please fix the errors listed above.]"
    except Exception as e:
        return f"Analysis tool error: {str(e)}"

# Note: Subagent execution requires passing the OpenAI client instance and base prompts.
# We will execute delegate_task from the main loop to preserve access to the API client.
