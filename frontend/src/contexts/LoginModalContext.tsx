import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface LoginModalContextType {
  isOpen: boolean;
  openLoginModal: (showRegister?: boolean) => void;
  closeLoginModal: () => void;
  showRegister: boolean;
  setShowRegister: (show: boolean) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(
  undefined
);

// eslint-disable-next-line react-refresh/only-export-components
export const useLoginModal = () => {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error("useLoginModal must be used within a LoginModalProvider");
  }
  return context;
};

interface LoginModalProviderProps {
  children: ReactNode;
}

export const LoginModalProvider = ({ children }: LoginModalProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const openLoginModal = (showRegisterForm = false) => {
    setShowRegister(showRegisterForm);
    setIsOpen(true);
  };

  const closeLoginModal = () => {
    setIsOpen(false);
    setShowRegister(false);
  };

  return (
    <LoginModalContext.Provider
      value={{
        isOpen,
        openLoginModal,
        closeLoginModal,
        showRegister,
        setShowRegister,
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
};

