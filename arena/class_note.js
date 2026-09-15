let page = 1;
let isLoading = false;
let hasMorePages = true;
let scrollTimer = null;
let retryAfter = 0;

window.onload = function() {
  renderTitle(slug);
  renderChannel(slug, page);
};

function handleScroll() {
  clearTimeout(scrollTimer);

  scrollTimer = setTimeout(() => {
    if (window.pageYOffset + window.innerHeight + 300 > document.documentElement.scrollHeight && !isLoading && hasMorePages && Date.now() > retryAfter) {
      page++;
      renderChannel(slug, page);
    }
  }, 200);
}

window.addEventListener('scroll', handleScroll);


// ======================================================
// Channel Title
// ======================================================

function renderTitle(slug) {
  fetch(`https://api.are.na/v3/channels/${slug}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Are.na API error: ${response.status}`);
      }

      return response.json();
    })
    .then(channel => {
      document.title = channel.title;
    })
    .catch(error => {
      console.error('Failed to load channel title:', error);
    });
}


// ======================================================
// Channel Contents
// ======================================================

function renderChannel(slug, page) {
  if (isLoading || !hasMorePages || Date.now() < retryAfter) {
    return;
  }

  isLoading = true;
  
  fetch(`https://api.are.na/v3/channels/${slug}/contents?page=${page}&per=30&sort=position_desc${page === 1 ? `&t=${Date.now()}` : ''}`)
    .then(response => {
      if (response.status === 429) {
        let reset = Number(response.headers.get('X-RateLimit-Reset'));

        retryAfter = reset ? reset * 1000 : Date.now() + 60000;

        throw new Error('Are.na API rate limit reached');
      }

      if (!response.ok) {
        throw new Error(`Are.na API error: ${response.status}`);
      }

      return response.json();
    })
    .then(channel => {

      hasMorePages = channel.meta?.has_more_pages ?? false;

      let elements = (channel.data || []).map(block => {

        return `
          <div class="Block ${block.type} ${block.title || ''}">

            ${(() => {

              switch (block.type) {

                // ======================================================
                // Image
                // ======================================================

                case 'Image':
                  return `
                    <a href="https://www.are.na/block/${block.id}" class="BlockInner__Link">
                      <img class="BlockInner__Image" src="${block.image?.src}">
                    </a>
                    <a href="https://www.are.na/block/${block.id}">
                      <p style="text-align: center; text-transform: uppercase;">${block.title}</p>
                    </a>
                  `;


                // ======================================================
                // Text
                // ======================================================

                case 'Text':
                  return `
                    <p style="margin-block-start: 0; margin-block-end: 0; text-transform: uppercase;">
                        ${block.content?.plain || ''}
                    </p>
                  `;


                // ======================================================
                // Attachment
                // ======================================================

                case 'Attachment':
                  return `
                    <a href="${block.source?.url}" class="BlockInner__Link">
                      <img class="BlockInner__Image" src="${block.image?.src}">
                    </a>
                    <a href="https://www.are.na/block/${block.id}">
                      <p style="text-align: center; text-transform: uppercase;">
                        ${block.title}
                      </p>
                    </a>
                  `;


                // ======================================================
                // Link
                // ======================================================

                case 'Link':
                  return `
                    <a href="${block.source?.url}" class="BlockInner__Link">
                      <img class="BlockInner__Image" src="${block.image?.src}">
                    </a>
                    <a href="https://www.are.na/block/${block.id}">
                      <p style="text-align: center; text-transform: uppercase;">
                        ${block.title}
                      </p>
                    </a>
                  `;


                // ======================================================
                // Embed
                // ======================================================

                case 'Embed':
                  return `
                    <a href="${block.source?.url}" class="BlockInner__Link">
                      <img class="BlockInner__Image" src="${block.image?.src}">
                    </a>
                    <a href="https://www.are.na/block/${block.id}">
                      <p style="text-align: center; text-transform: uppercase;">
                        ${block.title}
                      </p>
                    </a>
                  `;


                // ======================================================
                // Channel
                // ======================================================

                case 'Channel':
                  return `
                    <a href="https://www.are.na/channel/${block.slug}" class="BlockInner__Link" style="color: #ffffff;">
                      <img class="BlockInner__Image" src="../img/arena.jpg">
                    </a>
                    <a href="https://www.are.na/channel/${block.slug}">
                      <p style="text-align: center; text-transform: uppercase;">
                        ${block.title || ''}
                      </p>
                    </a>
                  `;


                default:
                  console.log('Unknown Are.na block type:', block.type, block);
                  return '';
              }

            })()}

          </div>
        `;
      }).join('');

      document.getElementsByClassName('ChannelContents')[0]?.insertAdjacentHTML('beforeend', elements);
    })
    .catch(error => {
      console.error('Failed to load Are.na channel:', error);

      if (page > 1) {
        page--;
      }
    })
    .finally(() => {
      isLoading = false;
    });
}