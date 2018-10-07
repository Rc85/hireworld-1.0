import React, { Component } from 'react';
import { LoginUser, ResetLogin } from '../../actions/LoginActions';
import { connect } from 'react-redux';
import SubmitButton from '../utils/SubmitButton';
import { withRouter, Redirect } from 'react-router-dom';
import Alert from '../utils/Alert';

class Login extends Component {
    constructor() {
        super();

        this.state  = {
            username: null,
            password: null,
            status: '',
            statusMessage: ''
        }
    }

    handleLogin() {
        this.props.dispatch(LoginUser(this.state));
    }

    render() {
        let status;

        if (this.props.user.status === 'error') {
            status = <Alert status={this.props.user.status} message={this.props.user.statusMessage} unmount={() => this.props.dispatch(ResetLogin(this.props.user))} />
        }

        if (this.props.user.user) {
            return(
                <Redirect to='/dashboard/edit' />
            )
        } else {
            return(
                <section id='login' className='main-panel'>
                    {status}
                    <div className='blue-panel shallow rounded'>
                        <h2>Login</h2>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            this.handleLogin();
                        }}>
                            <div className='form-group'>
                                <label htmlFor='username'>Username: </label>
                                <input className='form-control' type='text' name='username' id='login-username' onChange={(e) => this.setState({username: e.target.value})} />
                            </div>
            
                            <div className='form-group'>
                                <label htmlFor='password'>Password: </label>
                                <input className='form-control' type='password' name='password' id='login-password' onChange={(e) => this.setState({password: e.target.value})} />
                            </div>
    
                            <div className='text-right'>
                                <SubmitButton type='submit' loading={/loading$/.test(this.props.user.status)} value='Login' onClick={() => {return false}}/>
    
                                <div className='mt-3'>
                                    Forgot Password
                                </div>
                            </div>
                        </form>
                    </div>
                </section>
            )
        }
    }
}

export default withRouter(connect()(Login));