import { useNavigate } from '../compat/router'
import { ArrowLeft, Shield, Database, Lock, UserCheck, FileText, Mail, ArrowRight, Users2 } from 'lucide-react'
import { Button } from '../components/ui/button'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: "We collect only essential information needed to provide our services: your email, account details, and any reports you choose to submit. All data is encrypted and stored securely."
    },
    {
      icon: Shield,
      title: "How We Use Your Information",
      content: "Your information is used solely to deliver SpeakUp GC services, connect you with support resources, and improve our platform. We never sell or share your personal data with third parties."
    },
    {
      icon: Lock,
      title: "Data Security",
      content: "We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your information from unauthorized access."
    },
    {
      icon: UserCheck,
      title: "Your Rights",
      content: "You have the right to access, update, or delete your personal information at any time. You can also request a copy of your data or withdraw consent for data processing."
    },
    {
      icon: FileText,
      title: "Confidential Reporting",
      content: "All reports submitted through SpeakUp GC are treated with strict confidentiality. Access is limited to authorized personnel directly involved in case resolution."
    },
    {
      icon: Users2,
      title: "Committee on Decorum and Investigation (CODI)",
      content: "CODI is the designated body responsible for investigating and resolving complaints of sexual harassment, discrimination, and other misconduct. CODI members are trained to handle cases with confidentiality and professionalism."
    },
    {
      icon: Mail,
      title: "Contact Us",
      content: "If you have questions about our privacy practices or wish to exercise your privacy rights, please contact us at privacy@speakupgc.com."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/50">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 hover:border-green-500 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-lg shadow-green-500/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Your privacy is our priority. SpeakUp GC is committed to protecting your personal information and ensuring a safe, confidential environment for all users.
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-16">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 pt-1">
                    {section.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-14">
                  {section.content}
                </p>
              </div>
            )
          })}
        </div>

        {/* Last Updated */}
        <p className="text-center text-sm text-gray-400 mt-12">
          Last updated: March 17, 2026
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end mt-12 pt-8 border-t border-gray-200">
          <Button
            onClick={() => navigate('/terms')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Terms & Conditions</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/mission')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Mission</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
