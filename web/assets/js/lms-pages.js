(() => {
  const content = document.getElementById('page-content');
  const page = document.body.dataset.page;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const courseSlug = segments[1] || '';

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const safeUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (response.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return null;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || 'Não foi possível carregar este conteúdo.');
    }
    return response.json();
  };

  const showError = (error) => {
    content.replaceChildren(element('p', error.message, 'state-message'));
  };

  const renderMaterials = (materials) => {
    const list = element('div');
    if (!materials.length) {
      list.append(element('p', 'Nenhum material publicado.', 'state-message'));
      return list;
    }
    materials.forEach((material) => {
      const item = element('article', undefined, 'material-item');
      const details = element('div');
      details.append(element('strong', material.original_filename || material.filename));
      if (material.description) details.append(element('p', material.description));
      const link = element('a', 'Baixar', 'btn btn--secondary');
      const target = safeUrl(material.file_url);
      if (target) {
        link.href = target;
        link.addEventListener('click', () => {
          fetch(`/api/courses/${encodeURIComponent(courseSlug)}/materials/${material.id}/download`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => {});
        });
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
      }
      item.append(details, link);
      list.append(item);
    });
    return list;
  };

  const loadLesson = async () => {
    const lessonSlug = segments[3] || '';
    const lesson = await request(`/api/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`);
    if (!lesson) return;
    const title = element('h1', lesson.title);
    const description = element('p', lesson.description || 'Descrição em atualização.');
    const objectivesTitle = element('h2', 'Objetivos');
    const objectives = element('p', lesson.objectives || 'Objetivos em atualização.');
    const materialsTitle = element('h2', 'Materiais');
    content.replaceChildren(title, description, objectivesTitle, objectives, materialsTitle, renderMaterials(lesson.materials || []));
  };

  const loadMaterials = async () => {
    const materials = await request(`/api/courses/${encodeURIComponent(courseSlug)}/materials`);
    if (!materials) return;
    content.replaceChildren(element('h1', 'Materiais do curso'), renderMaterials(materials));
  };

  const loadForum = async () => {
    const topics = await request(`/api/courses/${encodeURIComponent(courseSlug)}/forum`);
    if (!topics) return;
    const title = element('h1', 'Fórum do curso');
    const form = element('form', undefined, 'module');
    const label = element('label', 'Novo tópico');
    label.htmlFor = 'topic-title';
    const input = element('input');
    input.id = 'topic-title';
    input.name = 'title';
    input.required = true;
    input.minLength = 3;
    input.maxLength = 200;
    const button = element('button', 'Publicar tópico', 'btn btn--primary');
    button.type = 'submit';
    form.append(label, input, button);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await request(`/api/courses/${encodeURIComponent(courseSlug)}/forum/topics`, {
        method: 'POST',
        body: JSON.stringify({ title: input.value.trim(), lesson_id: null }),
      });
      window.location.reload();
    });
    const list = element('div');
    if (!topics.length) list.append(element('p', 'Nenhuma discussão iniciada.', 'state-message'));
    topics.forEach((topic) => {
      const card = element('article', undefined, 'forum-topic');
      const link = element('a', topic.title);
      link.href = `/cursos/${encodeURIComponent(courseSlug)}/forum/${topic.id}`;
      card.append(link, element('p', `${topic.author} · ${topic.post_count} resposta(s)`));
      list.append(card);
    });
    content.replaceChildren(title, form, list);
  };

  const loadTopic = async () => {
    const topicId = segments[3];
    const topic = await request(`/api/courses/${encodeURIComponent(courseSlug)}/forum/topics/${encodeURIComponent(topicId)}`);
    if (!topic) return;
    const list = element('div');
    (topic.posts || []).forEach((post) => {
      const card = element('article', undefined, 'forum-topic');
      card.append(element('strong', post.author), element('p', post.body_md));
      list.append(card);
    });
    const form = element('form', undefined, 'module');
    const label = element('label', 'Sua resposta');
    label.htmlFor = 'post-body';
    const textarea = element('textarea');
    textarea.id = 'post-body';
    textarea.required = true;
    textarea.maxLength = 10000;
    const button = element('button', 'Responder', 'btn btn--primary');
    button.type = 'submit';
    form.append(label, textarea, button);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await request(`/api/courses/${encodeURIComponent(courseSlug)}/forum/topics/${encodeURIComponent(topicId)}/posts`, {
        method: 'POST',
        body: JSON.stringify({ body_md: textarea.value.trim() }),
      });
      window.location.reload();
    });
    content.replaceChildren(element('h1', topic.title), list, form);
  };

  const loadProfile = async () => {
    const user = await request('/api/auth/me');
    if (!user) return;
    const card = element('section', undefined, 'module');
    card.append(element('h1', 'Meu perfil'), element('p', `Nome: ${user.name || 'Não informado'}`), element('p', `E-mail: ${user.email}`));
    content.replaceChildren(card);
  };

  const setupSettings = async () => {
    await loadProfile();
    const form = document.getElementById('password-form');
    const status = document.getElementById('settings-status');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      if (data.get('new_password') !== data.get('confirm_password')) {
        status.textContent = 'A confirmação não corresponde à nova senha.';
        return;
      }
      try {
        await request('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify(Object.fromEntries(data)),
        });
        form.reset();
        status.textContent = 'Senha alterada com sucesso.';
      } catch (error) {
        status.textContent = error.message;
      }
    });
  };

  const loaders = {
    lesson: loadLesson,
    materials: loadMaterials,
    forum: loadForum,
    topic: loadTopic,
    profile: loadProfile,
    settings: setupSettings,
  };

  Promise.resolve(loaders[page]?.()).catch(showError);
})();
