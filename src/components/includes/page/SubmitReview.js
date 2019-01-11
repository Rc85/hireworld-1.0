import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextArea from '../../utils/TextArea';
import { NavLink } from 'react-router-dom';
import Rating from '../../utils/Rating';
import SubmitButton from '../../utils/SubmitButton';

class SubmitReview extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            stars: this.props.stars || 0
        }
    }

    setRating(num) {
        if (this.state.stars === num) {
            this.setState({stars: 0});
        } else {
            this.setState({stars: num});
        }
    }
    
    render() {
        let authMessage;

        if (this.props.message && this.props.message.review_token) {
            authMessage = <div className='mb-3'>
                <small><em>
                    This review is for {this.props.user.username === this.props.message.job_client ? <NavLink to={`/user/${this.props.message.job_user}`}>{this.props.message.job_user}</NavLink> : <NavLink to={`/user/${this.props.message.job_client}`}>{this.props.message.job_client}</NavLink>} and will hold a <span className='mini-badge mini-badge-success'><em>Job Complete Verified</em></span> tag that verifies a job was successfully completed. See FAQs for more details.
                </em></small>
            </div>;
        }

        return (
            <div className={`review-container ${this.props.show ? 'show' : ''}`}>
                <div className='review'>
                    <div className='review-header'>
                        {authMessage}
    
                        <Rating stars={this.state.stars} set={(stars) => this.setRating(stars)} />
                    </div>
    
                    <TextArea value={this.props.review} onChange={(val) => this.setState({review: val})} />

                    <div className='text-right'><SubmitButton type='button' status={this.props.status} onClick={() => this.props.submit(this.state.review, this.state.stars)} /> <button className='btn btn-secondary' onClick={() => this.props.cancel()}>Cancel</button></div>
                </div>
            </div>
        );
    }
}

SubmitReview.propTypes = {

}

export default SubmitReview;