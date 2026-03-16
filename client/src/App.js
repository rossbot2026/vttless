import {ChakraProvider} from '@chakra-ui/react';
import "./App.css";
import '@fontsource/inconsolata/200.css';
import theme from "./theme.js";
import AuthVerify from "./providers/AuthVerify.jsx";
import AuthProvider from "./providers/AuthProvider.jsx";
import { GameStateProvider } from "./contexts/GameStateContext.jsx";
import Routes from './routes';
import './common/axiosPrivate.js';




const App = () => {
  return (
    <ChakraProvider theme={theme}>
        <AuthProvider>
          <GameStateProvider>
            <Routes>           
                <AuthVerify />
            </Routes>
          </GameStateProvider>
        </AuthProvider>
    </ChakraProvider>
    
  );
}

export default App;
