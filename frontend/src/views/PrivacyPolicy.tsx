import styled from 'styled-components'
import { useNavigate } from '../compat/router'
import { ArrowLeft } from 'lucide-react'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  return (
    <Container>
      <BackButton onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </BackButton>
      <Content>
        <Title>Privacy Policy</Title>
        <MainText>
          Your privacy is our priority. SpeakUp GC is committed to protecting your personal information and ensuring a safe, confidential environment for all users.
        </MainText>

        <KeyPoints>
          <Point>
            <PointTitle>Information We Collect</PointTitle>
            <PointText>
              We collect only essential information needed to provide our services: your email, account details, and any reports you choose to submit. All data is encrypted and stored securely.
            </PointText>
          </Point>

          <Point>
            <PointTitle>How We Use Your Information</PointTitle>
            <PointText>
              Your information is used solely to deliver SpeakUp GC services, connect you with support resources, and improve our platform. We never sell or share your personal data with third parties.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Data Security</PointTitle>
            <PointText>
              We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your information from unauthorized access.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Your Rights</PointTitle>
            <PointText>
              You have the right to access, update, or delete your personal information at any time. You can also request a copy of your data or withdraw consent for data processing.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Confidential Reporting</PointTitle>
            <PointText>
              All reports submitted through SpeakUp GC are treated with strict confidentiality. Access is limited to authorized personnel directly involved in case resolution.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Contact Us</PointTitle>
            <PointText>
              If you have questions about our privacy practices or wish to exercise your privacy rights, please contact us at privacy@speakupgc.com.
            </PointText>
          </Point>
        </KeyPoints>

        <UpdateDate>Last updated: November 7, 2025</UpdateDate>

        <NavigationButtons>
          <NavButton onClick={() => navigate('/terms')}>
            <span>Terms & Conditions</span>
            <span style={{ marginLeft: '0.5rem' }}>→</span>
          </NavButton>
          <NavButton onClick={() => navigate('/mission')}>
            <span>Mission</span>
            <span style={{ marginLeft: '0.5rem' }}>→</span>
          </NavButton>
        </NavigationButtons>
      </Content>
    </Container>
  )
}

const Container = styled.div`
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
