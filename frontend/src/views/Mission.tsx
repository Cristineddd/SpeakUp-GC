import styled from 'styled-components'
import { useNavigate } from '../compat/router'
import { ArrowLeft } from 'lucide-react'

const Mission = () => {
  const navigate = useNavigate()

  return (
    <MissionContainer>
      <BackButton onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </BackButton>
      <MissionContent>
        <Title>Our Mission</Title>
        <MainMission>
          Empower individuals to speak up safely and get the help they need. We provide confidential reporting tools, connect you with trained professionals, and share knowledge to prevent misconduct and promote well‑being.
        </MainMission>

        <KeyPoints>
          <Point>
            <PointText>Confidential, secure reporting with clear next steps</PointText>
          </Point>
          <Point>
            <PointText>Evidence‑based resources for prevention and recovery</PointText>
          </Point>
          <Point>
            <PointText>Warm, human support available when you need it most</PointText>
          </Point>
        </KeyPoints>

        <NavigationButtons>
          <NavButton onClick={() => navigate('/privacy')}>
            <span>Privacy Policy</span>
            <span style={{ marginLeft: '0.5rem' }}>→</span>
          </NavButton>
          <NavButton onClick={() => navigate('/terms')}>
            <span>Terms & Conditions</span>
            <span style={{ marginLeft: '0.5rem' }}>→</span>
          </NavButton>
        </NavigationButtons>
      </MissionContent>
    </MissionContainer>
  )
}

const MissionContainer = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
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

const MissionContent = styled.div`
  max-width: 1200px;
  width: 100%;
  text-align: center;
`

const Title = styled.h1`
  font-size: 4.5rem;
  color: #333;
  margin-bottom: 3rem;
  font-weight: 700;
`

const MainMission = styled.p`
  font-size: 2rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 4rem;
  padding: 0 2rem;
`

const KeyPoints = styled.div`
  display: grid;
  gap: 2rem;
  margin-top: 3rem;
`

const Point = styled.div`
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }
`

const PointText = styled.h3`
  color: #444;
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1.5;
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

export default Mission
