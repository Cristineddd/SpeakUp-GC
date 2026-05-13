import { useNavigate } from '../compat/router'
import { ArrowLeft, Shield, Database, Lock, UserCheck, FileText, Mail, ArrowRight } from 'lucide-react'
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
          Last updated: November 7, 2025
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end mt-12 pt-8 border-t border-gray-200">
          <Button
            onClick={() => navigate('/terms')}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all"
          >
            <span>Terms & Conditions</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/mission')}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
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
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  background: #f5f5f5;
  overflow: hidden;
  position: relative;
`

const BackButton = styled.button`
  position: absolute;
  top: 2rem;
  left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #333;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: #f8f8f8;
    border-color: #666;
    transform: translateX(-3px);
  }
`

const Content = styled.div`
  max-width: 1200px;
  width: 100%;
  text-align: center;
`

const Title = styled.h1`
  font-size: 4.5rem;
  color: #333;
  margin-bottom: 2rem;
  font-weight: 700;
`

const MainText = styled.p`
  font-size: 1.8rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 4rem;
  padding: 0 2rem;
`

const KeyPoints = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 3rem;
  text-align: left;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const Point = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`

const PointTitle = styled.h3`
  color: #333;
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 1rem;
`

const PointText = styled.p`
  color: #666;
  font-size: 1.2rem;
  line-height: 1.6;
`

const UpdateDate = styled.p`
  margin-top: 3rem;
  color: #999;
  font-size: 1rem;
`

const SectionDivider = styled.hr`
  margin: 4rem 0;
  border: none;
  border-top: 2px solid #e0e0e0;
`

const MissionKeyPoints = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  margin-top: 3rem;
  text-align: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const MissionPoint = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`

const MissionPointText = styled.p`
  color: #555;
  font-size: 1.3rem;
  line-height: 1.6;
  font-weight: 500;
`

const NavigationButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    justify-content: center;
    flex-direction: column;
  }
`

const NavButton = styled.button`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`

export default PrivacyPolicy
