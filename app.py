from flask import Flask
app = Flask(__name__)

@app.route("/")
def index():
    return "Controle de Estudos Auditor Fiscal - Projeto Base"

if __name__ == "__main__":
    app.run(debug=True)
