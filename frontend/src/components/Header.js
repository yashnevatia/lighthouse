import PropTypes from 'prop-types'
// import { useLocation } from 'react-router-dom'
// import Button from './Button'

const Header = ({title}) => {
  // const location = useLocation()

  return (
    <header className='header'>
      <h1 style={headingStyle}>{title}</h1>
      <button></button>
    </header>
  )
}

Header.defaultProps = {
  title: 'Header',
}

Header.propTypes = {
  title: PropTypes.string.isRequired,
}

// CSS in JS
const headingStyle = {
  color: 'red',
  backgroundColor: 'black',
}

export default Header
