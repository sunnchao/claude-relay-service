export default {
  // Common
  common: {
    loading: 'Loading...',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    reset: 'Reset',
    actions: 'Actions',
    status: 'Status',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    back: 'Back',
    submit: 'Submit',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    upload: 'Upload'
  },

  // Layout
  layout: {
    title: 'Claude Relay Service',
    copyright: 'Claude Relay Service ©2024',
    logout: 'Logout',
    logoutSuccess: 'Logged out successfully'
  },

  // Navigation menu
  menu: {
    home: 'Home',
    dashboard: 'Dashboard',
    apiKeys: 'API Keys',
    usage: 'Usage Statistics',
    profile: 'Profile',
    login: 'Login',
    register: 'Register'
  },

  // Login page
  login: {
    title: 'Sign In',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    submit: 'Sign In',
    noAccount: "Don't have an account?",
    signUpNow: 'Sign up now',
    loginSuccess: 'Login successful!',
    loginFailed: 'Login failed',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email',
    passwordRequired: 'Please enter your password'
  },

  // Register page
  register: {
    title: 'Sign Up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    usernamePlaceholder: 'Enter your username',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter password (at least 8 characters)',
    confirmPasswordPlaceholder: 'Confirm your password',
    submit: 'Sign Up',
    hasAccount: 'Already have an account?',
    signInNow: 'Sign in now',
    registerSuccess: 'Registration successful!',
    registerFailed: 'Registration failed',
    usernameRequired: 'Please enter your username',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email',
    passwordRequired: 'Please enter your password',
    passwordMinLength: 'Password must be at least 8 characters',
    confirmPasswordRequired: 'Please confirm your password',
    passwordMismatch: 'Passwords do not match'
  },

  // Dashboard page
  dashboard: {
    title: 'Dashboard',
    stats: {
      apiKeys: 'API Keys',
      totalRequests: 'Total Requests',
      tokensUsed: 'Tokens Used',
      currentPlan: 'Current Plan'
    },
    usageOverview: 'Usage Overview',
    quickActions: 'Quick Actions',
    createApiKey: 'Create API Key',
    viewDetailedUsage: 'View Detailed Usage',
    updateProfile: 'Update Profile',
    recentActivity: 'Recent Activity',
    noData: 'No data available',
    chartPlaceholder: 'Usage chart will be displayed here',
    columns: {
      time: 'Time',
      apiKey: 'API Key',
      model: 'Model',
      tokens: 'Tokens',
      status: 'Status'
    }
  },

  // API Keys page
  apiKeys: {
    title: 'API Keys',
    createNewKey: 'Create New Key',
    name: 'Name',
    key: 'Key',
    status: 'Status',
    created: 'Created',
    lastUsed: 'Last Used',
    actions: 'Actions',
    namePlaceholder: 'My API Key',
    descriptionPlaceholder: 'Optional description',
    description: 'Description',
    permissions: 'Permissions',
    active: 'Active',
    inactive: 'Inactive',
    reveal: 'Reveal',
    hide: 'Hide',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this API key?',
    createModalTitle: 'Create New API Key',
    editModalTitle: 'Edit API Key',
    keyCreatedSuccess: 'API key created successfully',
    keyUpdatedSuccess: 'API key updated successfully',
    keyDeletedSuccess: 'API key deleted successfully',
    operationFailed: 'Operation failed',
    loadFailed: 'Failed to load API keys',
    newKeyTitle: 'Your New API Key',
    importantNotice: 'Important',
    saveKeyNotice: "Please save this API key now. You won't be able to see it again!",
    confirmSaved: 'I have saved this key',
    nameRequired: 'Please enter a key name'
  },

  // Usage Statistics page
  usage: {
    title: 'Usage Statistics',
    dateRange: 'Date Range',
    model: 'Model',
    allModels: 'All Models',
    totalRequests: 'Total Requests',
    totalTokens: 'Total Tokens',
    averageTokens: 'Average Tokens',
    dailyUsage: 'Daily Usage',
    modelDistribution: 'Model Distribution',
    noData: 'No usage data available',
    export: 'Export Data',
    refresh: 'Refresh',
    columns: {
      date: 'Date',
      model: 'Model',
      requests: 'Requests',
      tokens: 'Tokens',
      cost: 'Cost'
    }
  },

  // Profile page
  profile: {
    title: 'Profile',
    basicInfo: 'Basic Information',
    security: 'Security Settings',
    username: 'Username',
    email: 'Email',
    joinDate: 'Join Date',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    updateProfile: 'Update Profile',
    updatePassword: 'Update Password',
    updateSuccess: 'Update successful',
    updateFailed: 'Update failed',
    passwordChanged: 'Password changed successfully',
    currentPasswordRequired: 'Please enter current password',
    newPasswordRequired: 'Please enter new password',
    confirmPasswordRequired: 'Please confirm new password',
    passwordMismatch: 'Passwords do not match'
  },

  // Home page
  home: {
    title: 'Welcome to Claude Relay Service',
    subtitle: 'Powerful, Stable, and Secure AI API Relay Solution',
    features: {
      title: 'Core Features',
      multiAccount: {
        title: 'Multi-Account Management',
        description: 'Manage multiple Claude and Gemini accounts simultaneously'
      },
      highPerformance: {
        title: 'High Performance',
        description: 'Optimized request processing and response speed'
      },
      security: {
        title: 'Secure & Reliable',
        description: 'Enterprise-grade data encryption and security'
      },
      statistics: {
        title: 'Detailed Statistics',
        description: 'Real-time monitoring of usage and costs'
      }
    },
    getStarted: 'Get Started',
    learnMore: 'Learn More'
  },

  // Error messages
  errors: {
    networkError: 'Network error, please try again later',
    serverError: 'Server error',
    unauthorized: 'Unauthorized access',
    forbidden: 'Forbidden',
    notFound: 'Page not found',
    timeout: 'Request timeout',
    unknown: 'Unknown error'
  },

  // Success messages
  success: {
    operationSuccess: 'Operation successful',
    saveSuccess: 'Saved successfully',
    deleteSuccess: 'Deleted successfully',
    updateSuccess: 'Updated successfully'
  },

  // Language settings
  language: {
    title: 'Language',
    chinese: '中文',
    english: 'English'
  }
}