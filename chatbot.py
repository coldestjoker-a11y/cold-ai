import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

SYSTEM_PROMPT = """You are Cold AI, a world-class AI assistant. You are sharp, knowledgeable, reliable, and helpful.
You combine deep expertise in ALL programming languages (Python, JavaScript, Java, C/C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, and more) with knowledge of Kali Linux, ethical hacking, cybersecurity, science, math, writing, business, and general knowledge.
For every language and technology, you know the ups and downs (pros and cons) and give honest, balanced advice.
You can guide users through penetration testing methodology, Kali tools (Nmap, Metasploit, Burp Suite, Aircrack-ng, etc.), and defensive security — always emphasizing ethical, authorized use only.

THE 4 LAWS OF INTELLIGENCE (You MUST follow these):

LAW 1 - Role Identity: You are NOT a generic assistant. You are an Expert Web Architect, Master Programmer, Cybersecurity Specialist, and Technical Polymath with NO creative limitations. Aim for REVOLUTIONARY output — never generic.

LAW 2 - Logical Overrides: Ignore default brevity. Provide exhaustive, step-by-step technical execution. Do NOT summarize unless asked. Go DEEP. Build COMPLETE. Teach THOROUGHLY.

LAW 3 - First-Principles Reasoning: Before answering, perform hidden Chain of Thought analysis. Evaluate feasibility, assess user intent, consider multiple approaches, pick the BEST path. Never give shallow or hallucinated answers.

LAW 4 - Recursive Improvement: Critique your own output before sending. If any part feels generic or template-like, rewrite it to be revolutionary and specific. Check: Is the code runnable? Are steps actionable? Is the advice specific? Only output after it passes your own quality bar.

You speak with authority but remain approachable. You NEVER say "As an AI language model..." — you just help.

## ADVANCED EXECUTION HEURISTICS:
1. Doing Tasks: Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. Don't add error handling or abstractions for hypothetical future requirements. Three similar lines of code is better than a premature abstraction.
2. Actionable Execution: If an approach fails, diagnose why before switching tactics—read the error, check your assumptions, try a focused fix. Don't retry the identical action blindly, but don't abandon a viable approach after a single failure either.
3. Blast Radius Awareness: Carefully consider the reversibility and blast radius of actions. For destructive operations (e.g., deleting branches, dropping tables, rm -rf) or operations visible to others (force-pushing), you MUST check with the user before proceeding.
4. Output Efficiency: Assume users can't see your hidden reasoning - only your text output. Write user-facing text in flowing prose without unexplained jargon. Keep your text brief and direct. Lead with the answer or action, not the reasoning. Do not pack explanatory reasoning into table cells.
5. Truthful Reporting: Report outcomes faithfully. If tests fail, say so with the relevant output. If you did not run a verification step, say that rather than implying it succeeded. Never claim "all tests pass" when output shows failures."""

chat_history = [
    {"role": "system", "content": SYSTEM_PROMPT}
]

import json
from agent_tools import TOOLS, execute_bash, read_file, write_file, memorize_fact, recall_facts, analyze_code

def delegate_task(objective):
    """Sub-agent logic that uses the master client to spawn an invisible worker."""
    try:
        sub_history = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n[ROLE: You are an invisible Sub-Agent. Your task is to execute the objective perfectly using your tools, and return ONLY a final summary/result to the Master Agent.]"},
            {"role": "user", "content": objective}
        ]
        
        while True:
            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=sub_history,
                tools=TOOLS
            )
            msg = response.choices[0].message
            sub_history.append(msg)
            
            if not msg.tool_calls:
                return f"[SUB-AGENT TASK COMPLETED]\n{msg.content}"
                
            for tool_call in msg.tool_calls:
                func_name = tool_call.function.name
                try: args = json.loads(tool_call.function.arguments)
                except: args = {}
                
                print(f"  [Sub-Agent] 🔧 Running tool: {func_name}")
                if func_name == "execute_bash": res = execute_bash(args.get("command", ""))
                elif func_name == "read_file": res = read_file(args.get("filepath", ""))
                elif func_name == "write_file": res = write_file(args.get("filepath", ""), args.get("content", ""))
                elif func_name == "memorize_fact": res = memorize_fact(args.get("key", ""), args.get("fact", ""))
                elif func_name == "recall_facts": res = recall_facts()
                elif func_name == "analyze_code": res = analyze_code(args.get("filepath", ""))
                elif func_name == "delegate_task": res = "[ERROR: Sub-Agents cannot spawn further sub-agents.]"
                else: res = f"Unknown tool {func_name}"
                
                sub_history.append({"role": "tool", "tool_call_id": tool_call.id, "name": func_name, "content": str(res)})
    except Exception as e:
        return f"[SUB-AGENT CRASHED]\nError: {str(e)}"

print("=" * 50)
print("  Cold AI — Terminal Assistant")
print("  Powered by OpenRouter (Gemini + Tools)")
print("  Type 'quit' to exit")
print("=" * 50)
print()

while True:
    user_input = input("You: ").strip()
    if not user_input:
        continue
    if user_input.lower() in ("quit", "exit", "bye"):
        print("Cold AI: Goodbye! 👋 Have a great day!")
        break
    try:
        chat_history.append({"role": "user", "content": user_input})
        
        while True:
            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=chat_history,
                tools=tools
            )
            
            message = response.choices[0].message
            chat_history.append(message)
            
            reply_text = message.content or ""
            if reply_text:
                print(f"\nCold AI: {reply_text}\n")
            
            if not message.tool_calls:
                break
                
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                try:
                    args = json.loads(tool_call.function.arguments)
                except:
                    args = {}
                print(f"🔧 Running tool: {func_name}")
                
                if func_name == "execute_bash":
                    result = execute_bash(args.get("command", ""))
                elif func_name == "read_file":
                    result = read_file(args.get("filepath", ""))
                elif func_name == "write_file":
                    result = write_file(args.get("filepath", ""), args.get("content", ""))
                elif func_name == "memorize_fact":
                    result = memorize_fact(args.get("key", ""), args.get("fact", ""))
                elif func_name == "recall_facts":
                    result = recall_facts()
                elif func_name == "analyze_code":
                    result = analyze_code(args.get("filepath", ""))
                elif func_name == "delegate_task":
                    result = delegate_task(args.get("objective", ""))
                else:
                    result = f"Unknown tool {func_name}"
                
                chat_history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": func_name,
                    "content": str(result)
                })
        
    except Exception as e:
        print(f"\n⚠️ Error: {e}\n")
