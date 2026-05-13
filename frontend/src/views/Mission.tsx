import { useNavigate } from '../compat/router'
import { ArrowLeft, Shield, Lock, Heart, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'

const Mission = () => {
  const navigate = useNavigate()

  const keyPoints = [
    {
      icon: Lock,
      title: "Confidential, secure reporting with clear next steps",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Shield,
      title: "Evidence-based resources for prevention and recovery",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Heart,
      title: "Warm, human support available when you need it most",
      color: "from-teal-500 to-cyan-600"
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Our Mission
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
            Empower individuals to speak up safely and get the help they need. We provide confidential reporting tools, connect you with trained professionals, and share knowledge to prevent misconduct and promote well-being.
          </p>
        </div>

        {/* Key Points */}
        <div className="grid gap-6 mt-16">
          {keyPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${point.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 leading-relaxed pt-2">
                    {point.title}
                  </h3>
                </div>
              </div>
            )
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end mt-16 pt-8 border-t border-gray-200">
          <Button
            onClick={() => navigate('/privacy')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Privacy Policy</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/terms')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Terms & Conditions</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Mission
