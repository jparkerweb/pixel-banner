/**
 * Mock data fixtures for testing
 */

// Sample frontmatter configurations
export const sampleFrontmatter = {
  basic: {
    title: 'Test Note',
    banner: 'https://example.com/image.jpg',
    tags: ['test']
  },
  
  withIcon: {
    title: 'Test Note with Icon',
    banner: 'vault-image.jpg',
    'banner-icon': '🎯',
    tags: ['test', 'icon']
  },
  
  withPosition: {
    title: 'Test Note with Position',
    banner: 'nature',
    'banner-content-start-position': 150,
    tags: ['test', 'position']
  },
  
  complete: {
    title: 'Complete Test Note',
    banner: 'https://example.com/complete.jpg',
    'banner-icon': '📝',
    'banner-content-start-position': 200,
    tags: ['test', 'complete'],
    author: 'Test Author'
  },
  
  folderSpecific: {
    title: 'Folder Specific Note',
    banner: 'folder:images',
    'banner-icon': '📁',
    folder: 'test-folder'
  },
  
  invalidData: {
    title: 'Invalid Data Note',
    banner: null,
    'banner-icon': '',
    'banner-content-start-position': 'invalid',
    malformedField: { nested: 'object' }
  }
};

// Sample plugin settings
export const sampleSettings = {
  minimal: {
    bannerHeight: '300px',
    customBannerField: 'banner'
  },
  
  complete: {
    // API Keys
    pexelsApiKey: 'test-pexels-key',
    pixabayApiKey: 'test-pixabay-key',
    flickrApiKey: 'test-flickr-key',
    unsplashApiKey: 'test-unsplash-key',
    
    // Banner Settings
    bannerHeight: '400px',
    bannerStyle: 'cover',
    showBannerInInternalEmbed: true,
    showBannerInPreviewEmbed: true,
    showBannerInDocumentEmbed: true,
    fadeMultipleDisplays: true,
    
    // Custom Fields
    customBannerField: 'banner,image,cover',
    customBannerIconField: 'banner-icon,icon',
    customContentStartField: 'banner-content-start-position,content-start',
    
    // API Settings
    defaultKeywords: 'nature,landscape,abstract,minimal',
    numberOfImages: 20,
    imageSize: 'large2x',
    
    // Folder Images
    folderImages: {
      '/images/nature': {
        image: 'sunset.jpg',
        position: 100,
        height: '350px'
      },
      '/documents/work': {
        image: 'office.jpg',
        position: 50,
        height: '300px'
      }
    },
    
    // Version
    version: '3.6.5'
  },
  
  withFolderImages: {
    bannerHeight: '400px',
    folderImages: {
      '/test-folder': {
        image: 'test-folder-image.jpg',
        position: 120,
        height: '350px',
        style: 'contain',
        showInEmbed: false
      },
      '/images': {
        image: 'random',
        position: 80,
        height: '400px'
      }
    }
  }
};

// Sample API responses
export const sampleApiResponses = {
  pexels: {
    success: {
      photos: [
        {
          id: 1001,
          photographer: 'Test Photographer',
          src: {
            original: 'https://images.pexels.com/photos/1001/original.jpg',
            large2x: 'https://images.pexels.com/photos/1001/large2x.jpg',
            large: 'https://images.pexels.com/photos/1001/large.jpg',
            medium: 'https://images.pexels.com/photos/1001/medium.jpg',
            small: 'https://images.pexels.com/photos/1001/small.jpg'
          }
        },
        {
          id: 1002,
          photographer: 'Another Photographer',
          src: {
            original: 'https://images.pexels.com/photos/1002/original.jpg',
            large2x: 'https://images.pexels.com/photos/1002/large2x.jpg',
            large: 'https://images.pexels.com/photos/1002/large.jpg',
            medium: 'https://images.pexels.com/photos/1002/medium.jpg',
            small: 'https://images.pexels.com/photos/1002/small.jpg'
          }
        }
      ]
    },
    empty: {
      photos: []
    }
  },
  
  pixabay: {
    success: {
      total: 500,
      totalHits: 100,
      hits: [
        {
          id: 2001,
          user: 'TestUser1',
          largeImageURL: 'https://pixabay.com/photos/2001/large.jpg',
          webformatURL: 'https://pixabay.com/photos/2001/web.jpg',
          previewURL: 'https://pixabay.com/photos/2001/preview.jpg'
        },
        {
          id: 2002,
          user: 'TestUser2',
          largeImageURL: 'https://pixabay.com/photos/2002/large.jpg',
          webformatURL: 'https://pixabay.com/photos/2002/web.jpg',
          previewURL: 'https://pixabay.com/photos/2002/preview.jpg'
        }
      ]
    },
    empty: {
      total: 0,
      totalHits: 0,
      hits: []
    }
  },
  
  flickr: {
    success: 'jsonFlickrApi({"photos":{"page":1,"pages":1,"perpage":20,"total":"2","photo":[{"id":"3001","secret":"abc123","server":"1234","farm":1,"title":"Test Photo 1","isprimary":"1","ispublic":1,"isfriend":0,"isfamily":0},{"id":"3002","secret":"def456","server":"5678","farm":2,"title":"Test Photo 2","isprimary":"0","ispublic":1,"isfriend":0,"isfamily":0}]},"stat":"ok"})',
    empty: 'jsonFlickrApi({"photos":{"page":1,"pages":0,"perpage":20,"total":"0","photo":[]},"stat":"ok"})'
  },
  
  unsplash: {
    success: {
      total: 100,
      total_pages: 10,
      results: [
        {
          id: 'unsplash-4001',
          user: { name: 'Unsplash User 1' },
          urls: {
            raw: 'https://images.unsplash.com/photo-4001?raw=true',
            full: 'https://images.unsplash.com/photo-4001?full=true',
            regular: 'https://images.unsplash.com/photo-4001?regular=true',
            small: 'https://images.unsplash.com/photo-4001?small=true',
            thumb: 'https://images.unsplash.com/photo-4001?thumb=true'
          }
        },
        {
          id: 'unsplash-4002',
          user: { name: 'Unsplash User 2' },
          urls: {
            raw: 'https://images.unsplash.com/photo-4002?raw=true',
            full: 'https://images.unsplash.com/photo-4002?full=true',
            regular: 'https://images.unsplash.com/photo-4002?regular=true',
            small: 'https://images.unsplash.com/photo-4002?small=true',
            thumb: 'https://images.unsplash.com/photo-4002?thumb=true'
          }
        }
      ]
    },
    empty: {
      total: 0,
      total_pages: 0,
      results: []
    }
  },
  
  pixelBannerPlus: {
    credentialsSuccess: {
      success: true,
      message: 'Credentials verified successfully',
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        plan: 'premium'
      }
    },
    credentialsFailure: {
      success: false,
      message: 'Invalid credentials',
      error: 'AUTHENTICATION_FAILED'
    },
    infoSuccess: {
      success: true,
      info: {
        version: '2.0.0',
        features: ['ai-generation', 'premium-templates'],
        limits: {
          monthly_generations: 100,
          used_generations: 25
        }
      }
    }
  }
};

// Sample file structures
export const sampleFiles = {
  markdownFile: {
    path: 'test-note.md',
    content: `---
title: Test Note
banner: nature
tags: [test]
---

# Test Note

This is a test note with a banner.
`,
    frontmatter: {
      title: 'Test Note',
      banner: 'nature',
      tags: ['test']
    }
  },
  
  imageFile: {
    path: 'images/test-image.jpg',
    content: 'binary-image-data',
    type: 'image/jpeg'
  },
  
  folderStructure: {
    '/': {
      type: 'folder',
      children: ['notes', 'images', 'assets']
    },
    '/notes': {
      type: 'folder',
      children: ['daily-notes', 'projects']
    },
    '/images': {
      type: 'folder',
      children: ['test-image.jpg', 'banner.png', 'sunset.jpg']
    },
    '/assets': {
      type: 'folder',
      children: ['icons', 'templates']
    }
  }
};

// Sample DOM structures
export const sampleDOM = {
  markdownView: `
    <div class="markdown-preview-view markdown-rendered">
      <div class="markdown-preview-section">
        <div class="markdown-reading-view">
          <h1>Test Heading</h1>
          <p>Test content goes here.</p>
        </div>
      </div>
    </div>
  `,
  
  markdownEdit: `
    <div class="markdown-source-view">
      <div class="cm-editor">
        <div class="cm-scroller">
          <div class="cm-content">
            <div class="cm-line"># Test Heading</div>
            <div class="cm-line">Test content</div>
          </div>
        </div>
      </div>
    </div>
  `,
  
  banner: `
    <div class="pixel-banner" style="background-image: url('test.jpg'); height: 400px;">
      <div class="pixel-banner-icon">
        <span>🎯</span>
      </div>
    </div>
  `,
  
  modal: `
    <div class="modal">
      <div class="modal-bg"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Test Modal</h2>
        </div>
        <div class="modal-body">
          <p>Modal content</p>
        </div>
      </div>
    </div>
  `
};

// Sample cache data
export const sampleCache = {
  bannerState: {
    'test-file.md:leaf-123': {
      timestamp: Date.now(),
      imageUrl: 'https://example.com/cached-image.jpg',
      iconState: { icon: '🎯', style: 'color: blue;' },
      isShuffled: false
    },
    'another-file.md:leaf-456': {
      timestamp: Date.now() - 60000,
      imageUrl: 'https://example.com/old-image.jpg',
      iconState: null,
      isShuffled: true
    }
  },
  
  loadedImages: {
    'nature': 'https://api.pexels.com/cached-nature.jpg',
    'landscape': 'https://api.unsplash.com/cached-landscape.jpg',
    'abstract': 'https://api.pixabay.com/cached-abstract.jpg'
  },
  
  lastKeywords: {
    'test-file.md': 'nature',
    'another-file.md': 'landscape'
  }
};

// Sample error scenarios
export const sampleErrors = {
  networkError: new Error('Network request failed'),
  apiError: new Error('API returned error: 401 Unauthorized'),
  parseError: new Error('Failed to parse JSON response'),
  timeoutError: new Error('Request timeout'),
  notFoundError: new Error('File not found'),
  permissionError: new Error('Permission denied')
};

// Test utilities for creating complex scenarios
export function createComplexFolderStructure() {
  return {
    '/': ['Daily Notes', 'Projects', 'Resources', 'Archive'],
    '/Daily Notes': ['2023', '2024'],
    '/Daily Notes/2024': ['01-January', '02-February', '03-March'],
    '/Projects': ['Project A', 'Project B', 'Ideas'],
    '/Projects/Project A': ['meetings', 'documents', 'images'],
    '/Resources': ['Templates', 'Images', 'References'],
    '/Resources/Images': ['banners', 'icons', 'photos'],
    '/Resources/Images/banners': ['nature.jpg', 'abstract.png', 'minimal.jpg']
  };
}

export function createUserWorkflow(steps) {
  return {
    name: 'User Workflow Test',
    description: 'Simulates a complete user interaction workflow',
    steps: steps.map((step, index) => ({
      id: index + 1,
      action: step.action,
      target: step.target,
      data: step.data,
      expected: step.expected,
      timeout: step.timeout || 1000
    }))
  };
}