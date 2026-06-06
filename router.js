// Central Dynamic Router and Theme Manager
document.addEventListener('DOMContentLoaded', () => {
  // --- Dynamic Route Configuration ---
  const routes = {
    '': 'index.html',       // Default to About Me
    'about': 'index.html',
    'projects': 'projects.html',
    'contact': 'contact.html'
  };

  const contentArea = document.getElementById('content-area');
  const navLinks = document.querySelectorAll('.vishwa-nav a');

  // --- Dynamic Page Loading ---
  async function loadPage(pageKey) {
    const filename = routes[pageKey] || 'index.html';

    // 1. Trigger fade-out transition
    contentArea.className = 'fade-out';
    
    // Create and show page loader spinner after a brief delay if fetch is slow
    const loaderTimeout = setTimeout(() => {
      contentArea.innerHTML = `
        <div class="page-loader">
          <div class="spinner"></div>
        </div>
      `;
      contentArea.className = 'fade-in';
    }, 150);

    try {
      // 2. Fetch the page contents
      const response = await fetch(filename);
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.statusText}`);
      }
      const rawHtml = await response.text();
      clearTimeout(loaderTimeout);

      // 3. Parse fetched HTML string into a DOM Document
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // Update Title
      const pageTitle = doc.querySelector('title')?.textContent || "Vishwa's Portfolio";
      document.title = pageTitle;

      // Extract dynamic page contents (main layout or fallback to body)
      const pageMain = doc.querySelector('main') || doc.body;

      // Ensure contentArea is faded out before injecting
      contentArea.className = 'fade-out';
      
      // Small timeout to allow fade-out style to apply
      setTimeout(() => {
        // Inject HTML
        contentArea.innerHTML = pageMain.innerHTML;

        // 4. Handle dynamic CSS injection
        updatePageStyles(doc);

        // 5. Handle dynamic JS injection (scripts injected via innerHTML don't run)
        updatePageScripts(doc);

        // 6. Trigger fade-in transition
        contentArea.className = 'fade-in';
        setTimeout(() => {
          contentArea.className = '';
        }, 350);
      }, 150);

    } catch (error) {
      clearTimeout(loaderTimeout);
      console.error('Routing Error:', error);
      
      // Let's build a helpful CORS / general error overlay
      let errorMessage = `
        <div class="glass-card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; border-color: var(--accent-secondary);">
          <h2 style="color: var(--accent-secondary); margin-bottom: 20px;">⚠️ Page Navigation Failed</h2>
          <p style="margin-bottom: 20px;">Could not fetch page content. If you opened this file directly from your explorer (using the <code>file://</code> protocol), your browser blocks cross-origin fetches for security.</p>
          <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 0.85rem; margin-bottom: 25px; overflow-x: auto;">
            Error: ${error.message}
          </div>
          <p><strong>To fix this:</strong> Run a local development server or open the portfolio folder using a tool like VS Code Live Server, Python's server, or npm.</p>
        </div>
      `;
      contentArea.innerHTML = errorMessage;
      contentArea.className = 'fade-in';
    }
  }

  // Inject or update page-specific stylesheets
  function updatePageStyles(pageDoc) {
    // Remove existing page-specific styles
    const oldStyles = document.querySelectorAll('style[data-dynamic-page-style]');
    oldStyles.forEach(style => style.remove());

    // Extract style blocks from fetched document
    const newStyles = pageDoc.querySelectorAll('style');
    newStyles.forEach(style => {
      // Don't copy global styles, copy only page-specific ones
      if (!style.innerHTML.includes('/* Global Reset */') && !style.innerHTML.includes('/* General Reset */')) {
        const dynamicStyle = document.createElement('style');
        dynamicStyle.setAttribute('data-dynamic-page-style', 'true');
        dynamicStyle.innerHTML = style.innerHTML;
        document.head.appendChild(dynamicStyle);
      }
    });
  }

  // Inject and run page-specific scripts
  function updatePageScripts(pageDoc) {
    // Remove existing dynamic scripts
    const oldScripts = document.querySelectorAll('.dynamic-script');
    oldScripts.forEach(script => script.remove());

    // Extract script blocks
    const newScripts = pageDoc.querySelectorAll('script');
    newScripts.forEach(script => {
      const code = script.textContent;
      
      // Skip the direct-load redirect script to prevent loops
      if (code.includes('window.self === window.top') || code.includes('redirect')) {
        return;
      }

      const newScript = document.createElement('script');
      newScript.className = 'dynamic-script';

      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = code;
      }
      
      document.body.appendChild(newScript);
    });
  }

  // Update navigation menu highlighting
  function updateNavigation(pageKey) {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      // Match active hash
      const linkHash = href.split('#/')[1] || '';
      if (linkHash === pageKey || (pageKey === '' && linkHash === 'about')) {
        link.classList.add('vishwa-active');
      } else {
        link.classList.remove('vishwa-active');
      }
    });
  }

  // Central Router Dispatcher
  function handleRoute() {
    // Read route hash: e.g. "#/projects" -> "projects"
    const hash = window.location.hash;
    let pageKey = '';
    
    if (hash.startsWith('#/')) {
      pageKey = hash.substring(2);
    } else if (hash.startsWith('#')) {
      pageKey = hash.substring(1);
    }

    // Default route
    if (pageKey === 'index.html' || pageKey === '') {
      pageKey = 'about';
    }

    updateNavigation(pageKey);
    loadPage(pageKey);
  }

  // Bind Routing Listeners
  window.addEventListener('hashchange', handleRoute);
  
  // Initialize route on load
  handleRoute();

  // Intercept normal links if someone has standard anchor tags pointing to page files directly
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (anchor && anchor.getAttribute('href')) {
      const href = anchor.getAttribute('href');
      
      // If link points to one of the standard page files directly, intercept and map to hash
      if (href === 'index.html') {
        e.preventDefault();
        window.location.hash = '#/about';
      } else if (href === 'projects.html') {
        e.preventDefault();
        window.location.hash = '#/projects';
      } else if (href === 'contact.html') {
        e.preventDefault();
        window.location.hash = '#/contact';
      }
    }
  });


  // --- Theme Toggle Management ---
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = themeToggleBtn?.querySelector('i');

  // Initialize Theme (Load saved theme or default to dark)
  const savedTheme = localStorage.getItem('vishwa-theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme');
    if (themeIcon) {
      themeIcon.className = 'fas fa-moon'; // Show moon icon to toggle back to dark
    }
  } else {
    document.documentElement.classList.remove('light-theme');
    if (themeIcon) {
      themeIcon.className = 'fas fa-sun'; // Show sun icon to toggle to light
    }
  }

  // Toggle Theme Event Listener
  themeToggleBtn?.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light-theme');
    const newTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('vishwa-theme', newTheme);

    // Update Icon and show a quick confirmation toast
    if (themeIcon) {
      themeIcon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
    }

    showToast(`Swapped to ${newTheme} mode!`, 'theme');
  });

  // Utility toast notification function
  function showToast(message, type) {
    // Check if toast already exists
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    
    const icon = type === 'theme' ? 'sparkles' : 'envelope-open-text';
    toast.innerHTML = `
      <i class="fas fa-${icon} toast-icon"></i>
      <span>${message}</span>
    `;
    
    // Add show class
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Hide after 3s
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Expose toast function globally so other page scripts can trigger alerts (like contact form success)
  window.vishwaToast = showToast;
});
