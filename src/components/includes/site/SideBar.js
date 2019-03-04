import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NavLink, withRouter, Redirect } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faBell, faThList, faUserCircle, faUserFriends, faUserSlash } from '@fortawesome/free-solid-svg-icons';
import { LogoutUser } from '../../../actions/LoginActions';
import { connect } from 'react-redux';
import Loading from '../../utils/Loading';
import LoginPanel from './LoginPanel';
import BrowseMenu from '../site/BrowseMenu';
import { ToggleMenu } from '../../../actions/MenuActions';
import NotificationPanel from '../site/NotificationPanel';

class SideBar extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hover: false
        }
    }

    toggleMenu(e) {
        e.stopPropagation();

        if (this.props.menu.id === 'browse-menu' && this.props.menu.show) {
            this.props.dispatch(ToggleMenu(false, 'browse-menu'));
        } else {
            this.props.dispatch(ToggleMenu(true, 'browse-menu'));
        }
    }

    showNotificationPanel(e) {
        e.stopPropagation();

        if (this.props.menu.id = 'notification-panel' && this.props.menu.show) {
            this.props.dispatch(ToggleMenu(false, 'notification-panel'));
        } else {
            this.props.dispatch(ToggleMenu(true, 'notification-panel'));
        }
    }
    
    render() {
        let sidebarContent;

        let browseLink = <div className='sidebar-link-container'>
            <Link
            className='browse-listing-link'
            text={<h5>Browse Sectors</h5>}
            onClick={(e) => this.toggleMenu(e)}
            icon={<FontAwesomeIcon icon={faThList} />}
            active={/^\/(browse|sector|user)/.test(this.props.location.pathname) || (this.props.menu.id === 'browse-menu' && this.props.menu.show)} />
        </div>;

        if (this.props.user.status === 'getting session') {
            sidebarContent = <Loading size='5x' />;
        } else if (this.props.user.status === 'get session success') {
            sidebarContent = <React.Fragment>
                <div id='sidebar-buttons-container'>
                    <div><FontAwesomeIcon icon={faUserCircle} className='text-highlight mr-1' /> <NavLink to='/dashboard'>{this.props.user.user.username}</NavLink></div>
                    <div><NavLink to='/dashboard/friends'><FontAwesomeIcon icon={faUserFriends} className={this.props.location.pathname === '/dashboard/friends' ? 'text-highlight' : ''} /></NavLink></div>
                    <div><NavLink to='/dashboard/blocked-users'><FontAwesomeIcon icon={faUserSlash} /></NavLink></div>
                    {this.props.user.user ? <React.Fragment><div className='notification-button-container sidebar-button' onClick={(e) => this.showNotificationPanel(e)}>{parseInt(this.props.user.notifications) > 0 ? <span className='notification-counter mini-badge mini-badge-danger'>{this.props.user.notifications}</span> : ''}<FontAwesomeIcon icon={faBell} size='lg' id='notification-icon'/><NotificationPanel show={this.props.menu.id === 'notification-panel' && this.props.menu.show} user={this.props.user} /></div></React.Fragment> : ''}
                </div>

                <hr className='w-90' />
                
                <div id='sidebar-links'>
                    {browseLink}
                    {this.props.items.map((item, i) => {
                        return <div key={i} className='sidebar-link-container'>
                            <Link
                            name={item.name}
                            text={<h5>{item.name}</h5>}
                            link={item.link}
                            icon={item.icon}
                            active={item.active}
                            items={item.items}
                            messageCount={parseInt(item.messageCount) > 0 ? parseInt(item.messageCount) : false}
                            user={this.props.user} />
                        </div>
                    })}

                    <div className='sidebar-link-container'>
                        <Link text={<h5>Logout</h5>} icon={<FontAwesomeIcon icon={faSignOutAlt} />} onClick={() => this.props.dispatch(LogoutUser())} />
                    </div>
                </div>
            </React.Fragment>;
        } else if (this.props.user.status === 'error' || this.props.user.status === 'not logged in' || this.props.user.status === 'access error') {
            sidebarContent = <React.Fragment>
                <div id='sidebar-links'>
                    {browseLink}
                </div>

                <LoginPanel />
            </React.Fragment>
            ;
        }

        return (
            <section id='sidebar'>
                <BrowseMenu show={this.props.menu.id === 'browse-menu' && this.props.menu.show} />

                <div className='text-center'><NavLink to='/'><img src='/images/logo_xl.png' id='hireworld-logo' /></NavLink></div>

                {sidebarContent}
            </section>
        );
    }
}

class Link extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            hover: false
        }
    }

    handleMouseOver() {
        if (!this.props.active) {
            this.setState({hover: true});
        }
    }
    
    render() {
        let subItems, link, messageCount;

        if (this.props.active && this.props.items) {
            subItems = this.props.items.map((item, i) => {
                return <NavLink key={i} to={item.link}><div className={`sidebar-sub-item ${item.active ? 'active' : ''}`}><div className='sidebar-sub-item-link'>{item.name}</div> {item.messageCount > 0 ? <span className='mini-badge mini-badge-danger'>{item.messageCount}</span> : ''}</div></NavLink>
            });
        }

        if (this.props.messageCount > 0) {
            messageCount = <div className='mini-badge mini-badge-danger'>{this.props.messageCount}</div>
        }

        if (this.props.onClick) {
            link = <div className={`sidebar-link-item-container ${this.props.active ? 'active' : ''} ${this.props.className ? this.props.className : ''}`} onMouseOver={() => this.handleMouseOver()} onMouseOut={() => this.setState({hover: false})} onClick={(e) => this.props.onClick(e)}>
                <div className={`sidebar-link-item-wrapper ${this.props.className ? this.props.className : ''}`}>
                    <div className={`sidebar-link-item ${this.props.className ? this.props.className : ''}`}>
                        {this.props.icon ? <div className={`sidebar-link-icon ${this.props.active ? 'active' : ''} ${this.props.className ? this.props.className : ''}`}>{this.props.icon}</div> : ''}
                        <div className={`sidebar-link-text ${this.props.className ? this.props.className : ''}`}>{this.props.text}</div>
                    </div>
                    <div className={`sidebar-link-underline ${this.state.hover ? 'hover' : ''} ${this.props.className ? this.props.className : ''}`}></div>
                </div>
            </div>;
        } else {
            link = <NavLink to={this.props.link}>
                <div className={`sidebar-link-item-container ${this.props.active ? 'active' : ''}`} onMouseOver={() => this.handleMouseOver()} onMouseOut={() => this.setState({hover: false})}>
                    <div className='sidebar-link-item-wrapper'>
                        <div className='sidebar-link-item'>
                            {this.props.icon ? <div className={`sidebar-link-icon ${this.props.active ? 'active' : ''}`}>{this.props.icon}</div> : ''}
                            <div className='sidebar-link-text'>{this.props.text}</div>
                            {messageCount}
                        </div>
                        <div className={`sidebar-link-underline ${this.state.hover ? 'hover' : ''}`}></div>
                    </div>
                </div>
            </NavLink>;
        }

        return(
            <React.Fragment>
                {link}

                {this.props.active ? <div className='sidebar-sub-items-container'>{subItems}</div> : ''}
            </React.Fragment>
        )
    }
}

SideBar.propTypes = {
    user: PropTypes.object,
    items: PropTypes.array
};

const mapStateToProps = state => {
    return {
        menu: state.Menu
    }
}

export default withRouter(connect(mapStateToProps)(SideBar));