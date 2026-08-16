import React, { createContext, useContext, useState, useEffect } from 'react'

const TRANSLATIONS = {
  en: {
    // Navigation & Common
    app_title: 'Civic GreenNet',
    tagline: 'Smart Civic Governance Platform',
    dashboard: 'Dashboard',
    my_reports: 'My Reports',
    report_issue: 'Report an Issue',
    nearby_issues: 'Nearby Issues',
    followed_issues: 'Followed Issues',
    city_map: 'City Map',
    notifications: 'Notifications',
    profile: 'Profile & Privacy',
    settings: 'Settings',
    logout: 'Log Out',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    view_all: 'View All',
    details: 'Details',
    search_placeholder: 'Search complaints by ID, title, keyword...',

    // Dashboard Hero & Greetings
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    welcome_citizen: 'Welcome to Civic GreenNet. Your voice helps make your neighborhood cleaner, safer, and better.',
    track_reports: 'Track My Reports',
    explore_pulse: 'Community Pulse',
    
    // KPIs
    total_reports: 'Total Reports',
    open_reports: 'Open Reports',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    reopened: 'Reopened',
    community_support: 'Community Support',
    civic_score: 'Civic Score',
    civic_level: 'Contribution Level',
    civic_streak: 'Active Streak',
    days_active: 'days active',

    // Badges & Gamification
    badges_earned: 'Earned Badges',
    view_leaderboard: 'Community Leaderboard',
    next_level: 'Next Milestone',
    points_needed: 'points needed for',

    // Active Attention Banner
    resolution_ready: 'Resolution Ready for Verification',
    officer_working: 'Officer Working on Your Case',
    reopened_notice: 'Complaint Reopened for Review',
    verify_resolution_btn: 'Verify Resolution',
    view_update_btn: 'View Update',

    // Quick Shortcuts
    quick_shortcuts: 'Quick Report Shortcuts',
    quick_shortcuts_sub: 'Select an issue category to launch the reporting wizard.',

    // Community Pulse
    pulse_title: 'Community Pulse & Transparency',
    pulse_sub: 'Live civic momentum, top supported neighborhood issues, and verified resolutions.',
    most_supported: 'Most Supported Issues',
    fastest_growing: 'Top Category Trends',
    recently_resolved: 'Recently Verified Resolutions',
    resolution_rate: 'City Resolution Rate',
    avg_resolution_time: 'Avg. Resolution Time',

    // Complaint Form Steps
    step_category: 'Category',
    step_description: 'Description & AI',
    step_evidence: 'Evidence',
    step_location: 'Location',
    step_duplicate: 'Duplicate Check',
    step_privacy: 'Privacy',
    step_review: 'Review & Submit',
    submit_report: 'Submit Civic Report',
    duplicate_alert: 'Similar Issue Already Reported',
    duplicate_desc: 'We noticed a similar issue in your neighborhood. You can support the existing report to help municipal teams prioritize it, or proceed with your report.',
    support_existing: 'Support Existing Issue',
    continue_reporting: 'Continue Reporting',

    // Verification & Reopening
    confirm_resolution: 'Confirm Resolution',
    request_reopening: 'Request Reopening',
    satisfaction_prompt: 'Are you satisfied with the resolution provided by the municipal team?',
    reopen_reason_prompt: 'Please explain why the issue is not satisfactorily resolved:',
    reopen_reason_placeholder: 'Describe what remains broken or unaddressed (min 5 characters)...',

    // Comments & Evidence
    comments: 'Community Comments',
    add_comment_placeholder: 'Add a helpful comment or update on this issue...',
    post_comment: 'Post Comment',
    post_anonymous: 'Post as Anonymous Citizen',
    support_issue: 'Support this issue',
    supported: 'Supported',
    follow_issue: 'Follow updates',
    following: 'Following',
    before_after: 'Before & After Resolution Proof',
    original_evidence: 'Initial Report Evidence',
    officer_resolution_proof: 'Officer Resolution Proof',
    report_comment: 'Report Inappropriate',

    // PWA & Offline
    offline_draft_notice: 'You have a saved offline draft ready to submit.',
    restore_draft: 'Restore Draft',
    dismiss: 'Dismiss',
    pwa_install_title: 'Install Civic GreenNet App',
    pwa_install_desc: 'Get fast access, offline drafting, and real-time civic notifications on your device.',
    install_btn: 'Install App'
  },

  hi: {
    // Navigation & Common
    app_title: 'सिविक ग्रीननेट',
    tagline: 'स्मार्ट नागरिक शासन प्रणाली',
    dashboard: 'डैशबोर्ड',
    my_reports: 'मेरी शिकायतें',
    report_issue: 'समस्या दर्ज करें',
    nearby_issues: 'आस-पास की समस्याएं',
    followed_issues: 'फ़ॉलो की गई समस्याएं',
    city_map: 'शहर का मानचित्र',
    notifications: 'सूचनाएं',
    profile: 'प्रोफ़ाइल और गोपनीयता',
    settings: 'सेटिंग्स',
    logout: 'लॉग आउट',
    loading: 'लोड हो रहा है...',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    back: 'पीछे',
    next: 'आगे',
    submit: 'जमा करें',
    view_all: 'सभी देखें',
    details: 'विवरण',
    search_placeholder: 'शिकायत संख्या, शीर्षक या शब्द से खोजें...',

    // Dashboard Hero & Greetings
    good_morning: 'सुप्रभात',
    good_afternoon: 'नमस्कार',
    good_evening: 'शुभ संध्या',
    welcome_citizen: 'सिविक ग्रीननेट में आपका स्वागत है। आपकी भागीदारी आपके क्षेत्र को स्वच्छ और सुरक्षित बनाती है।',
    track_reports: 'शिकायतें ट्रैक करें',
    explore_pulse: 'सामुदायिक रुझान',

    // KPIs
    total_reports: 'कुल शिकायतें',
    open_reports: 'सक्रिय शिकायतें',
    in_progress: 'प्रक्रियाधीन',
    resolved: 'समाधानित',
    reopened: 'पुनः खोली गई',
    community_support: 'सामुदायिक समर्थन',
    civic_score: 'नागरिक योगदान स्कोर',
    civic_level: 'योगदान स्तर',
    civic_streak: 'सक्रियता स्ट्रीक',
    days_active: 'दिन सक्रिय',

    // Badges & Gamification
    badges_earned: 'अर्जित बैज',
    view_leaderboard: 'नागरिक लीडरबोर्ड',
    next_level: 'अगला स्तर',
    points_needed: 'अंक आवश्यक',

    // Active Attention Banner
    resolution_ready: 'समाधान सत्यापन के लिए तैयार है',
    officer_working: 'अधिकारी आपकी शिकायत पर कार्य कर रहे हैं',
    reopened_notice: 'शिकायत समीक्षा हेतु पुनः खोली गई',
    verify_resolution_btn: 'समाधान सत्यापित करें',
    view_update_btn: 'अपडेट देखें',

    // Quick Shortcuts
    quick_shortcuts: 'त्वरित शिकायत शॉर्टकट',
    quick_shortcuts_sub: 'शिकायत दर्ज करने के लिए श्रेणी चुनें।',

    // Community Pulse
    pulse_title: 'सामुदायिक रुझान और पारदर्शिता',
    pulse_sub: 'लाइव नागरिक गतिविधियां, शीर्ष समर्थित समस्याएं और सत्यापित समाधान।',
    most_supported: 'सर्वाधिक समर्थित समस्याएं',
    fastest_growing: 'मुख्य श्रेणी रुझान',
    recently_resolved: 'हाल ही में सत्यापित समाधान',
    resolution_rate: 'शहर समाधान दर',
    avg_resolution_time: 'औसत समाधान समय',

    // Complaint Form Steps
    step_category: 'श्रेणी',
    step_description: 'विवरण और एआई',
    step_evidence: 'साक्ष्य / फोटो',
    step_location: 'स्थान',
    step_duplicate: 'समान शिकायत जांच',
    step_privacy: 'गोपनीयता',
    step_review: 'समीक्षा और सबमिट',
    submit_report: 'शिकायत सबमिट करें',
    duplicate_alert: 'समान समस्या पहले से दर्ज है',
    duplicate_desc: 'आपके क्षेत्र में एक समान समस्या पहले से दर्ज मिली है। आप मौजूदा शिकायत का समर्थन कर सकते हैं या नई रिपोर्ट जारी रख सकते हैं।',
    support_existing: 'मौजूदा शिकायत का समर्थन करें',
    continue_reporting: 'नई शिकायत जारी रखें',

    // Verification & Reopening
    confirm_resolution: 'समाधान की पुष्टि करें',
    request_reopening: 'पुनः खोलने का अनुरोध',
    satisfaction_prompt: 'क्या आप नगर निगम टीम द्वारा दिए गए समाधान से संतुष्ट हैं?',
    reopen_reason_prompt: 'कृपया बताएं कि समस्या का संतोषजनक समाधान क्यों नहीं हुआ:',
    reopen_reason_placeholder: 'वर्णन करें कि क्या शेष रह गया है (न्यूनतम 5 अक्षर)...',

    // Comments & Evidence
    comments: 'सामुदायिक टिप्पणियां',
    add_comment_placeholder: 'समस्या पर अपनी टिप्पणी या जानकारी लिखें...',
    post_comment: 'टिप्पणी भेजें',
    post_anonymous: 'गुमनाम नागरिक के रूप में पोस्ट करें',
    support_issue: 'इस समस्या का समर्थन करें',
    supported: 'समर्थन किया गया',
    follow_issue: 'अपडेट्स फ़ॉलो करें',
    following: 'फ़ॉलो कर रहे हैं',
    before_after: 'समाधान पूर्व और पश्चात साक्ष्य',
    original_evidence: 'प्रारंभिक रिपोर्ट साक्ष्य',
    officer_resolution_proof: 'अधिकारी द्वारा समाधान प्रमाण',
    report_comment: 'आपत्तिजनक रिपोर्ट करें',

    // PWA & Offline
    offline_draft_notice: 'आपके पास ऑफ़लाइन ड्राफ्ट सुरक्षित है जो सबमिट के लिए तैयार है।',
    restore_draft: 'ड्राफ्ट लोड करें',
    dismiss: 'हटाएं',
    pwa_install_title: 'सिविक ग्रीननेट ऐप इंस्टॉल करें',
    pwa_install_desc: 'त्वरित पहुंच, ऑफ़लाइन ड्राफ्ट और रीयल-टाइम सूचनाएं सीधे अपने फोन/पीसी पर प्राप्त करें।',
    install_btn: 'ऐप इंस्टॉल करें'
  }
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('cgn_language') || 'en'
    } catch (e) {
      return 'en'
    }
  })

  const setLanguage = (newLang) => {
    const valid = newLang === 'hi' ? 'hi' : 'en'
    setLangState(valid)
    try {
      localStorage.setItem('cgn_language', valid)
    } catch (e) {}
  }

  const t = (key) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
    return dict[key] || TRANSLATIONS.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      lang: 'en',
      setLanguage: () => {},
      t: (key) => TRANSLATIONS.en[key] || key
    }
  }
  return context
}

export default {
  LanguageProvider,
  useTranslation,
  TRANSLATIONS
}
