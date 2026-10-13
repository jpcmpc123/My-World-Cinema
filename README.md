# Letterboxd Clone (Frontend Completo)

Um clone completo e de alta fidelidade do frontend do **Letterboxd**, construído com **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4** e integrado em tempo real com a **API do TMDb (The Movie Database)**.

---

## 🎨 Principais Recursos e Telas

1. **Design System Oficial do Letterboxd**:
   - Tema escuro cinematográfico (`#14181c`, `#1c2228`, `#2c3440`).
   - Acentos oficiais: Verde (`#00e054`), Azul (`#40bcf4`), Laranja (`#ff8000`).
   - Pôsteres com proporção estrita `2:3`, cantos arredondados e borda hover verde.
   - Sistema de avaliação por **estrelas com precisão de meia-estrela** (de `0.5` a `5.0` estrelas).
   - Histograma de distribuição de avaliações em **10 barras verdes**.

2. **Navegação & Header**:
   - Logotipo oficial de 3 círculos coloridos.
   - **Busca Typeahead em tempo real**: busca filmes no TMDb conforme você digita, com pré-visualização de pôster, título e ano.
   - Botão rápido de ação primária **`+ LOG`**.
   - Menu suspenso de perfil.

3. **Modal Global de Log Rápido (`+ LOG`)**:
   - Busca/seleção de filme.
   - Registro de data da sessão (com atalho para a data atual).
   - Indicador de "Rewatch" (já assistido antes).
   - Seletor interativo de estrelas e botão de curtir (coração).
   - Campo para resenha/crítica e marcador de spoilers (*"Contains spoilers"*).
   - Tags personalizadas.
   - Celebração com confetes e sincronização com o Diário.

4. **Página de Detalhes do Filme (`/film/:id`)**:
   - Backdrop panorâmico de alta resolução com máscara de gradiente suave.
   - Painel lateral de ações (Assistido, Curtido, Watchlist, Avaliar, Logar, Compartilhar).
   - Gráfico de histograma de avaliações da comunidade com média aritmética.
   - Onde assistir (Streaming providers via JustWatch/TMDb).
   - Abas com Elenco (fotos e personagens), Equipe técnica (Diretor, Roteirista, Diretor de Fotografia), Detalhes e Gêneros.
   - Críticas da comunidade e carrossel de filmes recomendados/similares.

5. **Catálogo de Filmes (`/films`)**:
   - Filtros dinâmicos por Gênero (Ação, Ficção Científica, Drama, Terror, etc.) e Década (2020s, 2010s, 2000s, 90s, 80s, etc.).
   - Ordenação por Popularidade, Mais Bem Avaliados ou Data de Lançamento.
   - Paginação completa.

6. **Perfil do Usuário (`/profile` ou `/:username`)**:
   - Os icônicos **"4 Filmes Favoritos"** (*The Top 4*) com modal para trocar qualquer um dos 4 pôsteres.
   - Estatísticas: total de filmes assistidos, filmes vistos no ano e total de listas.
   - Abas dedicadas: *Overview*, *Films*, *Diary*, *Reviews*, *Watchlist*, *Lists* e *Likes*.
   - Edição de perfil (nome, biografia, localização e website).

7. **Diário de Cinema (`/diary`)**:
   - Tabela cronológica completa estilo calendário com dia, miniatura, título, ano, estrelas, coração, ícone de rewatch e link de resenha.
   - Filtro por ano.

8. **Watchlist com Roleta de Sorteio (`/watchlist`)**:
   - Grade de filmes salvos para assistir.
   - Botão **Shuffle ("Pick For Me")**: roleta animada que sorteia aleatoriamente um filme da sua watchlist para você assistir esta noite.

9. **Listas e Criador de Listas (`/lists`, `/list/:id`, `/list/new`)**:
   - Visualização de listas da comunidade com leque de pôsteres sobrepostos.
   - Criação de listas personalizadas com modo Ranqueado (1..N) ou Não-ranqueado, busca de filmes, reordenação (subir/descer) e notas individuais por filme.

10. **Comunidade & Journal (`/members`, `/journal`)**:
    - Diretório de membros e críticos com opção de seguir/deixar de seguir.
    - Seção editorial com matérias sobre festivais, ensaios e cinema autoral.

---

## 🚀 Como Rodar o Projeto

No terminal do projeto (`Cloneleterboxd`), execute:

```bash
npm run dev
```

Acesse no seu navegador: `http://localhost:5173`
