# Relatório PetCare (SBC Reviews 2025, LaTeX)

Rascunho inicial do relatório do projeto PetCare, em português, no modelo SBC Reviews 2025.

- `overleaf/`: projeto LaTeX pronto para upload.
- `relatorio-petcare-overleaf.zip`: o mesmo conteúdo, com os arquivos na raiz do zip.
- `template/`: template original da SBC, sem alterações.

## Como subir no Overleaf

1. No Overleaf, clique em **New Project → Upload Project** e envie `relatorio-petcare-overleaf.zip`.
2. Em **Menu → Settings → Compiler**, escolha **XeLaTeX** (ou LuaLaTeX). A classe da SBC não compila com pdfLaTeX.
3. Em **Main document**, confira se está `main.tex`.
4. Clique em **Recompile**. O BibTeX roda automaticamente.

## Estrutura

```
main.tex              preâmbulo, título, autores, resumo/abstract, declarações
refs.bib              referências (documentação oficial, datasheets, um artigo de acústica felina)
secoes/introducao.tex      problema, motivação, objetivos
secoes/visao-geral.tex     componentes e fluxo de uso
secoes/hardware.tex        sensores, pinagem, condicionamento, limitações
secoes/firmware.tex        módulos ESP-IDF, pareamento, descoberta, limitações
secoes/stack.tex           escolha de tecnologias
secoes/arquitetura.tex     diagrama TikZ, contrato POST /api/readings, API, classificador, web
secoes/desenvolvimento.tex linha do tempo (commits) e correções
secoes/resultados.tex      o que funcionou / não funcionou / testes a fazer
secoes/conclusao.tex       conclusão e trabalhos futuros
sbcreviews-2025.cls, apalike-sol.bst, aas_macros.sty, sectsty.sty   arquivos do template (sem alterações)
```

## Pendências

Tudo o que a equipe precisa completar está marcado com `\pendente{...}` e aparece em **vermelho** no PDF.
Para listar as pendências no Overleaf, procure por `\pendente` (Ctrl+Shift+F).

As principais pendências são:

- **Capa**: nomes dos autores, ORCID, e-mails, instituição, endereço e nome da disciplina.
- **Hardware**: modelo da placa ESP32, foto ou esquemático da montagem, folha de dados do CR18-8DP (tensão, NA/NF, distância de detecção), **circuito de adaptação de nível real** do CR18-8DP para o GPIO25 e a tensão medida, e a amplitude do sinal AO do microfone medida no osciloscópio.
- **Sonar**: a linha de base de 17,8 cm (7 pol.) fica muito perto do mínimo do sensor (6 pol. = 15,24 cm). Nessa montagem, a queda de 10 cm exigida para detectar a entrada do gato **não pode acontecer**. Verifiquem a altura de instalação e repitam o teste.
- **Firmware**: publicar o módulo `capacitive_sensor` (hoje só no build local `d02654c-dirty`) e descrever sua lógica.
- **Resultados**: todos os testes de bancada (sonar contra trena, capacitivo cheio/vazio, alcance do microfone, matriz de confusão do classificador, latência, estabilidade).
- **Desenvolvimento**: etapas de hardware que não aparecem nos commits e problemas de montagem.
- **Declarações**: contribuições (CRediT), financiamento, disponibilidade do código e **uso de IA generativa** (obrigatório na SBC).
- **Resumo**: a SBC pede de 500 a 750 palavras. O resumo atual é curto e deve ser ampliado depois dos resultados.
- **Figuras**: capturas de tela da aplicação web.

Nenhum dado de medição foi inventado. Os valores numéricos do texto vêm do código (limiares, taxas de amostragem), do datasheet do fabricante ou do registro serial do protótipo (17,8 cm; SoftAP após 10 s). No exemplo JSON da seção de arquitetura, os números são apenas ilustrativos, e o texto avisa isso.
