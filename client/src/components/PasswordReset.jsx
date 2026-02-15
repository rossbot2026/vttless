import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import AuthService from '../providers/AuthService';
import {useAuth} from '../providers/AuthProvider';
import Logo from './Logo';
import { OAuthButtonGroup } from './OAuthButtonGroup';
import { useToast } from '@chakra-ui/react';
import {
    Box,
    Button,
    Container,
    Divider,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Heading,
    HStack,
    Input,
    Stack,
    Text,
    Center,
    InputGroup,
    InputRightElement,
    IconButton
  } from '@chakra-ui/react'

const PasswordReset = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetToken, setResetToken] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const toast = useToast();

    // Check for token in URL on component mount
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setResetToken(token);
            setIsResetMode(true);
        }
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting}
    } = useForm();

    const showErrorToast = (message) => {
        toast({
            title: 'Error',
            description: message,
            status: 'error',
            duration: 5000,
            isClosable: true
        });
    };

    const showSuccessToast = (message) => {
        toast({
            title: 'Success',
            description: message,
            status: 'success',
            duration: 5000,
            isClosable: true
        });
    };

    const handleForgotPassword = async (data) => {
        try {
            await AuthService.forgotPassword(data.email);
            showSuccessToast('Password reset link sent to your email');
            setEmail("");
        } catch (error) {
            showErrorToast(error.response?.data?.message || 'Failed to send reset link');
        }
    };

    const handleResetPassword = async (data) => {
        try {
            await AuthService.resetPassword(resetToken, data.password);
            showSuccessToast('Password reset successfully');
            navigate('/login');
        } catch (error) {
            showErrorToast(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const renderForgotPasswordForm = () => {
        return (
            <form onSubmit={handleSubmit(handleForgotPassword)}>
                <Stack spacing="6">
                    <Stack spacing="5">
                        <FormControl isInvalid={errors.email}>
                            <FormLabel htmlFor="email">Email Address</FormLabel>
                            <Input 
                                type="email" 
                                placeholder="Enter your email"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
                                        message: 'Invalid email format'
                                    }
                                })}
                            />
                            <FormErrorMessage> {errors.email && errors.email.message} </FormErrorMessage>
                        </FormControl>
                    </Stack>
                    <Stack spacing="6">
                        <Button isLoading={isSubmitting} type='submit'>
                            Send Reset Link
                        </Button>
                        <Button variant="ghost" onClick={() => navigate('/login')}>
                            Back to Login
                        </Button>
                    </Stack>
                </Stack>
            </form>
        );
    };

    const renderResetPasswordForm = () => {
        return (
            <form onSubmit={handleSubmit(handleResetPassword)}>
                <Stack spacing="6">
                    <Stack spacing="5">
                        <FormControl isInvalid={errors.password}>
                            <FormLabel htmlFor="password">New Password</FormLabel>
                            <Input
                                name="password"
                                type="password"
                                placeholder="Enter new password"
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                                })}
                            />
                            <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
                        </FormControl>
                    </Stack>
                    <Stack spacing="6">
                        <Button isLoading={isSubmitting} type='submit'>
                            Reset Password
                        </Button>
                        <Button variant="ghost" onClick={() => navigate('/login')}>
                            Back to Login
                        </Button>
                    </Stack>
                </Stack>
            </form>
        );
    };

    const renderContent = () => {
        if (isResetMode) {
            return (
                <Stack spacing="6">
                    <Heading size={{ base: 'xs', md: 'sm' }}>Reset Your Password</Heading>
                    <Text color="fg.muted">
                        Enter your new password below
                    </Text>
                    {renderResetPasswordForm()}
                </Stack>
            );
        }
        
        return (
            <Stack spacing="6">
                <Heading size={{ base: 'xs', md: 'sm' }}>Forgot Password?</Heading>
                <Text color="fg.muted">
                    Enter your email address and we'll send you a link to reset your password
                </Text>
                {renderForgotPasswordForm()}
            </Stack>
        );
    };

    return (
        <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
            <Stack spacing="8">
                <Stack spacing="6">
                    <Center><Logo /></Center>
                    <Stack spacing={{ base: '2', md: '3' }} textAlign="center">
                        <Heading size={{ base: 'xs', md: 'sm' }}>Password Reset</Heading>
                        <Text color="fg.muted">
                            {isResetMode ? "Enter your new password" : "Don't worry, we can help"}
                        </Text>
                    </Stack>
                </Stack>
                <Box
                    py={{ base: '0', sm: '8' }}
                    px={{ base: '4', sm: '10' }}
                    bg={{ base: 'transparent', sm: 'bg.surface' }}
                    boxShadow={{ base: 'none', sm: 'md' }}
                    borderRadius={{ base: 'none', sm: 'xl' }}
                >
                    {renderContent()}
                </Box>
            </Stack>
        </Container>
    );
};

export default PasswordReset;