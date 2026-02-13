import { useState } from "react";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../providers/AuthService';
import {useAuth} from '../providers/AuthProvider';
import Logo from './Logo';
import {OAuthButtonGroup} from './OAuthButtonGroup';
import {PasswordField} from './PasswordField';
import { useToast } from '@chakra-ui/react';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import {
    Box,
    Button,
    Checkbox,
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

const Login = () => {
    const navigate = useNavigate();
    const {user, setUser} = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const toast = useToast();

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting}
    } = useForm();

    function onSubmit(values) {
        return new Promise((resolve) => {
            setTimeout(() => {
                alert(JSON.stringify(values, null, 2));
                resolve();
            }, 3000);
        });
    }

    // const handleUsernameChange = (event) => {
    //     setUsername(event.target.value);
    // }

    // const handlePasswordChange = (event) => {
    //     setPassword(event.target.value);
    // }
    
    const showErrorToast = () => {
        
        toast({
            title: 'Login Failed',
            description: 'Bad Username or Password',
            status: 'error',
            duration: 5000,
            isClosable: true
        });
    }

    const handleLoginFormSubmit =  (values) => {
        // if (err) {
        //     console.log("Error in handling form submit: " + err);
        // }
        //event.preventDefault();

        AuthService.login(values.username, values.password).then((res) => {
            setUser(res);
            navigate('/');
        }).catch( (err) => {
            showErrorToast();
        });
    };

    return (
        <form onSubmit={handleSubmit(handleLoginFormSubmit)}>
            <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
                <Stack spacing="8">
                <Stack spacing="6">
                    <Center><Logo /></Center>
                    <Stack spacing={{ base: '2', md: '3' }} textAlign="center">
                    <Heading size={{ base: 'xs', md: 'sm' }}>Log in to your account</Heading>
                    <Text color="fg.muted">
                        Don't have an account? <Link to="/signup">Sign up</Link>
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
                    <Stack spacing="6">
                    <Stack spacing="5">
                        <FormControl isInvalid={errors.username}>
                            <FormLabel htmlFor="text">Username</FormLabel>
                            <Input 
                                //id="username" 
                                type="text" 
                                placeholder="Username"
                                {...register('username', {
                                    required: 'This is required',
                                    minLength: { value: 3, message: 'Minimum length should be 3'}
                                })}
                            />
                            <FormErrorMessage> {errors.username && errors.username.message} </FormErrorMessage>
                        </FormControl>
                        <FormControl isInvalid={errors.password}>
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <Input
                                //id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                {...register('password', {
                                    required: 'This is required',
                                    minLength: { value: 3, message: 'Minimum length should be 3'}
                                })}
                            />
                            <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
                        </FormControl>
                        
                    </Stack>
                    <HStack justify="space-between">
                        <Checkbox defaultChecked>Remember me</Checkbox>
                        <Button 
                            variant="text" 
                            size="sm"
                            onClick={() => navigate('/password-reset')}>
                            Forgot password?
                        </Button>
                    </HStack>
                    <Stack spacing="6">
                        <Button isLoading={isSubmitting} type='submit'>Sign in</Button>
                        <HStack>
                        <Divider />
                        <Text textStyle="sm" whiteSpace="nowrap" color="fg.muted">
                            or continue with
                        </Text>
                        <Divider />
                        </HStack>
                        <OAuthButtonGroup />
                    </Stack>
                    </Stack>
                </Box>
                </Stack>
            </Container>
        </form>
    );
};

export default Login;