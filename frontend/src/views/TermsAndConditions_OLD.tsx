import styled from 'styled-components'
import { useNavigate } from '../compat/router'
import { ArrowLeft } from 'lucide-react'

const TermsAndConditions = () => {
  const navigate = useNavigate()

  return (
    <Container>
      <BackButton onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </BackButton>
      <Content>
        <Title>Terms & Conditions</Title>
        <MainText>
          Welcome to SpeakUp GC. By using our platform, you agree to these terms and conditions. Please read them carefully to understand your rights and responsibilities.
        </MainText>

        <KeyPoints>
          <Point>
            <PointTitle>Acceptance of Terms</PointTitle>
            <PointText>
              By accessing and using SpeakUp GC, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
            </PointText>
          </Point>

          <Point>
            <PointTitle>User Responsibilities</PointTitle>
            <PointText>
              You agree to provide accurate information, maintain the confidentiality of your account, and use SpeakUp GC only for lawful purposes. Misuse of the platform may result in account suspension.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Reporting & Confidentiality</PointTitle>
            <PointText>
              All reports are treated confidentially and reviewed by authorized personnel. False reporting or abuse of the system is prohibited and may lead to disciplinary action.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Intellectual Property</PointTitle>
            <PointText>
              All content, features, and functionality on SpeakUp GC are owned by us and protected by copyright, trademark, and other laws. Unauthorized use is prohibited.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Limitation of Liability</PointTitle>
            <PointText>
              SpeakUp GC provides tools and resources to support you, but we are not liable for any direct, indirect, or consequential damages arising from your use of the platform.
            </PointText>
          </Point>

          <Point>
            <PointTitle>Changes to Terms</PointTitle>
            <PointText>
              We reserve the right to modify these terms at any time. Continued use of SpeakUp GC after changes constitutes acceptance of the revised terms.
            </PointText>
          </Point>
        </KeyPoints>

        <UpdateDate>Last updated: November 7, 2025</UpdateDate>

        <NavigationButtons>
          <NavButton onClick={() => navigate('/privacy')}>
            <span>Privacy Policy</span>
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

export default TermsAndConditions
