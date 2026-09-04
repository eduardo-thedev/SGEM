# 🪖 SGEM — Sistema de Gestão do Efetivo Militar

### Dashboard de Controle de Efetivo Militar

Sistema web desenvolvido para **controle, organização e acompanhamento do efetivo militar**, centralizando informações de recrutas, licenças, fatos observados e indicadores operacionais em uma única aplicação.

O SGEM foi projetado para funcionar de forma **self-hosted**, com dados armazenados localmente e sem dependência de serviços externos ou mensalidades.

---

## 📌 Sobre o Projeto

O **Sistema de Gestão do Efetivo Militar (SGEM)** foi desenvolvido para facilitar o gerenciamento operacional do efetivo, substituindo controles dispersos por uma aplicação centralizada.

A solução permite cadastrar e consultar recrutas, acompanhar situações de LNC, registrar Fatos Observados e visualizar indicadores através de um dashboard.

O sistema também foi desenvolvido pensando em ambientes onde **controle dos dados, disponibilidade local e simplicidade de implantação** são requisitos importantes.

---

# 🚀 Funcionalidades

## 📊 Dashboard

Painel central com visão geral do efetivo:

- Total de recrutas cadastrados
- LNCs ativas
- Contagem de FO+
- Contagem de FO−
- Gráfico de desempenho por recruta
- Dispensas recentes e ativas
- Últimos recrutas cadastrados

---

## 👥 Gestão do Efetivo

Listagem completa dos recrutas cadastrados.

### Visualização

- Modo lista/tabela
- Modo grade com cards e fotos
- Busca por diferentes campos
- Ordenação dos registros
- Indicadores rápidos de FO e LNC
- Acesso à ficha completa

### Busca

É possível pesquisar por:

- Nome completo
- Nome de guerra
- Número de ID
- CPF
- Telefone

---

## 🪪 Ficha do Recruta

Cada recruta possui uma ficha completa contendo:

- Foto
- Número de ID
- Nome completo
- Nome de guerra
- Data de nascimento
- CPF
- Telefone
- Contatos de emergência
- Título de eleitor
- Zona eleitoral
- Seção eleitoral
- Histórico de LNCs
- Histórico de Fatos Observados

### Ações disponíveis

- Editar recruta
- Adicionar LNC
- Adicionar FO
- Excluir recruta

---

# 📋 LNC — Licença Não Concedida

O sistema permite registrar e acompanhar as LNCs vinculadas a cada recruta.

Cada registro possui:

- Data de início
- Data de término
- Motivo
- Situação

O status é calculado automaticamente com base na data atual:

```text
┌──────────────┐
│     LNC      │
└──────┬───────┘
       │
       ├── Data atual dentro do período
       │        ↓
       │     VIGENTE
       │
       ├── Data final já passou
       │        ↓
       │     VENCIDA
       │
       └── Data inicial ainda não chegou
                ↓
             FUTURA
