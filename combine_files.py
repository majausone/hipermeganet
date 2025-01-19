import os

extensions = ['.py', '.js', '.html', '.md', 'css']
output_file = 'ALL.txt'

def read_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='ISO-8859-1') as file:
            return file.read()

files = os.listdir('.')
target_files = [f for f in files if any(f.endswith(ext) for ext in extensions)]

combined_content = ''
for file in target_files:
    combined_content += f"--- Contenido de {file} ---\n"
    combined_content += read_file(file)
    combined_content += "\n\n"

with open(output_file, 'w', encoding='utf-8') as output:
    output.write(combined_content)

print(f"Se han combinado {len(target_files)} archivos en {output_file}")
