import { expect, fixture, html } from '@open-wc/testing';
import { StatusBadge, getStatusDotClass } from './status-badge.js';

describe('getStatusDotClass', () => {
  it('returns done for done category', () => {
    expect(getStatusDotClass('done')).to.equal('done');
  });

  it('returns inprogress for indeterminate category', () => {
    expect(getStatusDotClass('indeterminate')).to.equal('inprogress');
  });

  it('returns todo for new category', () => {
    expect(getStatusDotClass('new')).to.equal('todo');
  });

  it('returns todo for unknown category', () => {
    expect(getStatusDotClass('unknown')).to.equal('todo');
    expect(getStatusDotClass('')).to.equal('todo');
  });
});

describe('StatusBadge', () => {
  it('is defined', () => {
    const el = document.createElement('status-badge');
    expect(el).to.be.instanceOf(StatusBadge);
  });

  it('renders empty when no status', async () => {
    const el = await fixture<StatusBadge>(html`<status-badge></status-badge>`);
    expect(el.shadowRoot?.querySelector('.status-badge')).to.be.null;
  });

  it('renders status name', async () => {
    const status = {
      id: '1',
      name: 'In Progress',
      statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge).to.exist;
    expect(badge?.textContent?.trim()).to.include('In Progress');
  });

  it('applies correct class for done status', async () => {
    const status = {
      id: '1',
      name: 'Done',
      statusCategory: { id: 3, key: 'done', name: 'Done', colorName: 'green' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge?.classList.contains('status-done')).to.be.true;
  });

  it('applies correct class for in-progress status', async () => {
    const status = {
      id: '1',
      name: 'In Progress',
      statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'blue' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge?.classList.contains('status-inprogress')).to.be.true;
  });

  it('applies correct class for todo status', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge?.classList.contains('status-todo')).to.be.true;
  });

  it('adds clickable class when clickable', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status} .clickable=${true}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge?.classList.contains('clickable')).to.be.true;
  });

  it('shows arrow when showArrow is true', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status} .showArrow=${true}></status-badge>`);
    const arrow = el.shadowRoot?.querySelector('.dropdown-arrow');
    expect(arrow).to.exist;
  });

  it('adds transitioning class when transitioning', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status} .transitioning=${true}></status-badge>`);
    const badge = el.shadowRoot?.querySelector('.status-badge');
    expect(badge?.classList.contains('transitioning')).to.be.true;
  });

  it('dispatches status-click event on click when clickable', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status} .clickable=${true}></status-badge>`);
    
    let eventFired = false;
    el.addEventListener('status-click', () => {
      eventFired = true;
    });
    
    const badge = el.shadowRoot?.querySelector('.status-badge') as HTMLElement;
    badge?.click();
    
    expect(eventFired).to.be.true;
  });

  it('does not dispatch event when not clickable', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status}></status-badge>`);
    
    let eventFired = false;
    el.addEventListener('status-click', () => {
      eventFired = true;
    });
    
    const badge = el.shadowRoot?.querySelector('.status-badge') as HTMLElement;
    badge?.click();
    
    expect(eventFired).to.be.false;
  });

  it('does not dispatch event when transitioning', async () => {
    const status = {
      id: '1',
      name: 'To Do',
      statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
    };
    const el = await fixture<StatusBadge>(html`<status-badge .status=${status} .clickable=${true} .transitioning=${true}></status-badge>`);
    
    let eventFired = false;
    el.addEventListener('status-click', () => {
      eventFired = true;
    });
    
    const badge = el.shadowRoot?.querySelector('.status-badge') as HTMLElement;
    badge?.click();
    
    expect(eventFired).to.be.false;
  });
});


