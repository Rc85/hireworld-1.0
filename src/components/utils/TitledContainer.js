import React from 'react';
import PropTypes from 'prop-types';

const TitledContainer = props => {
    return(
        <div id={props.id} className={`titled-container ${props.shadow ? 'with-shadow' : ''} ${props.className ? props.className : ''}`}>
            <div className='title-wrapper'>
                <div className='titled-container-icon'>{props.icon}</div>
                <h3 className={`bg-${props.bgColor ? props.bgColor : 'highlight'} ${props.textColor ? `text-${props.textColor}` : ''}`}>{props.title}</h3>
            </div>

            <div className={`${props.scroll ? 'with-scroll' : 'no-scroll'}`}>{props.children}</div>
        </div>
    )
}

TitledContainer.propTypes = {
    title: PropTypes.string,
    bgColor: PropTypes.string,
    textColor: PropTypes.string,
    shadow: PropTypes.bool
};

export default TitledContainer;